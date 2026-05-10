"""
Real Recommendation Engine — replaces mock logic.

Implements:
  - 4 Collaborative Filtering methods (User-KNN, Item-Cosine, Euclidean, SVD)
  - Content-Based (TF-IDF + one-hot)
  - Popularity Baseline (cold start)
  - Hybrid scoring (CF*0.7 + CB*0.3)
  - Knowledge-Based Gift Finder (tag scoring)

The engine precomputes matrices on first call and caches them.
Invalidate via `engine.invalidate()` when data changes.
"""
import logging
import time
import threading
import numpy as np
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from scipy.spatial.distance import cdist
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Rating, Favourite, Product, User

logger = logging.getLogger(__name__)

# ─── Tag Mappings for Gift Finder ────────────────────────────────────────────

CATEGORY_TAGS = {
    "electronics":       ["tech", "gadgets", "electronics"],
    "clothing":          ["fashion", "clothing", "style"],
    "books":             ["learning", "reading", "bookworm", "personal growth"],
    "home & kitchen":    ["home", "kitchen", "cooking", "practical"],
    "sports & outdoors": ["sports", "outdoor", "fitness"],
    "beauty":            ["self-care", "beauty", "luxury"],
    "food & beverages":  ["food", "cooking", "kitchen"],
    "toys & games":      ["kids", "fun", "family"],
    "health & wellness": ["health", "wellness", "fitness"],
    "music":             ["music", "entertainment", "creative"],
    "office supplies":   ["professional", "practical", "office"],
    "garden":            ["home", "outdoor", "practical"],
}

RECIPIENT_TAGS = {
    "mom":       ["home", "self-care", "kitchen", "wellness"],
    "dad":       ["tech", "outdoor", "practical", "sports"],
    "partner":   ["luxury", "self-care", "fashion", "style"],
    "friend":    ["fun", "entertainment", "food"],
    "child":     ["kids", "fun", "learning", "creative"],
    "colleague": ["practical", "professional", "office"],
    "self":      ["self-care", "wellness", "entertainment"],
}

OCCASION_TAGS = {
    "birthday":    ["fun", "luxury", "entertainment"],
    "anniversary": ["luxury", "self-care", "fashion"],
    "holiday":     ["food", "home", "family"],
    "graduation":  ["learning", "personal growth", "professional"],
    "just because":["fun", "food", "entertainment"],
}

PERSONALITY_TAGS = {
    "techie":      ["tech", "gadgets", "electronics"],
    "outdoorsy":   ["sports", "outdoor", "fitness"],
    "creative":    ["creative", "music", "bookworm"],
    "bookworm":    ["reading", "learning", "bookworm"],
    "foodie":      ["food", "cooking", "kitchen"],
    "fashionable": ["fashion", "style", "beauty", "luxury"],
}

AGE_TAGS = {
    "kids":    ["kids", "fun", "learning"],
    "teens":   ["tech", "fashion", "music", "entertainment"],
    "adults":  ["practical", "home", "professional"],
    "seniors": ["home", "practical", "wellness", "health"],
}

BUDGET_MAP = {
    "under $25":  25,
    "under $50":  50,
    "under $100": 100,
    "any budget": 99999,
}


class RecommendationEngine:
    """
    Precomputes similarity matrices and provides recommendation methods.
    Thread-safe with a lock for invalidation.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._fitted = False

        # Data arrays
        self._user_ids: list[int] = []
        self._product_ids: list[int] = []
        self._user_idx: dict[int, int] = {}
        self._product_idx: dict[int, int] = {}
        self._rating_matrix: Optional[np.ndarray] = None

        # CF matrices
        self._user_sim_cosine: Optional[np.ndarray] = None
        self._item_sim_cosine: Optional[np.ndarray] = None
        self._user_sim_euclidean: Optional[np.ndarray] = None
        self._svd_predictions: Optional[np.ndarray] = None

        # Content-Based
        self._product_features: Optional[np.ndarray] = None
        self._product_data: list[dict] = []

        # Popularity
        self._popularity_scores: dict[int, float] = {}

    def invalidate(self):
        """Reset cached matrices so they are recomputed on next call."""
        with self._lock:
            self._fitted = False
            logger.info("RecommendationEngine cache invalidated")

    def _ensure_fitted(self, db: Session):
        """Build matrices if not already done."""
        if self._fitted:
            return
        with self._lock:
            if self._fitted:
                return
            t0 = time.time()
            self._fit(db)
            self._fitted = True
            logger.info(f"RecommendationEngine fitted in {time.time() - t0:.2f}s")

    def _fit(self, db: Session):
        """Load data from DB and precompute all matrices."""
        # ── Load all ratings ──
        ratings = db.query(Rating.user_id, Rating.product_id, Rating.value).all()

        # ── Load all favourites as implicit 5-star ──
        favs = db.query(Favourite.user_id, Favourite.product_id).all()

        # ── Collect unique IDs ──
        user_id_set = set()
        product_id_set = set()
        for r in ratings:
            user_id_set.add(r.user_id)
            product_id_set.add(r.product_id)
        for f in favs:
            user_id_set.add(f.user_id)
            product_id_set.add(f.product_id)

        self._user_ids = sorted(user_id_set)
        self._product_ids = sorted(product_id_set)
        self._user_idx = {uid: i for i, uid in enumerate(self._user_ids)}
        self._product_idx = {pid: i for i, pid in enumerate(self._product_ids)}

        n_users = len(self._user_ids)
        n_products = len(self._product_ids)

        if n_users == 0 or n_products == 0:
            logger.warning("No data to fit recommendation engine")
            self._rating_matrix = np.zeros((1, 1))
            return

        # ── Build rating matrix ──
        R = np.zeros((n_users, n_products), dtype=np.float32)
        for r in ratings:
            ui = self._user_idx.get(r.user_id)
            pi = self._product_idx.get(r.product_id)
            if ui is not None and pi is not None:
                R[ui, pi] = float(r.value)

        # Add favourites as implicit 5-star (only if not already rated)
        for f in favs:
            ui = self._user_idx.get(f.user_id)
            pi = self._product_idx.get(f.product_id)
            if ui is not None and pi is not None and R[ui, pi] == 0:
                R[ui, pi] = 5.0

        self._rating_matrix = R

        # ── User-User Cosine Similarity ──
        # Replace zeros with NaN for mean-centering, then back to 0
        R_centered = R.copy()
        user_means = np.nanmean(np.where(R > 0, R, np.nan), axis=1)
        user_means = np.nan_to_num(user_means, nan=0.0)
        for i in range(n_users):
            mask = R_centered[i] > 0
            R_centered[i, mask] -= user_means[i]

        self._user_sim_cosine = cosine_similarity(R_centered)
        np.fill_diagonal(self._user_sim_cosine, 0)

        # ── Item-Item Cosine Similarity ──
        R_items = R.T  # (n_products, n_users)
        self._item_sim_cosine = cosine_similarity(R_items)
        np.fill_diagonal(self._item_sim_cosine, 0)

        # ── Euclidean Distance → Similarity ──
        dists = cdist(R_centered, R_centered, metric="euclidean")
        self._user_sim_euclidean = 1.0 / (1.0 + dists)
        np.fill_diagonal(self._user_sim_euclidean, 0)

        # ── SVD ──
        n_components = min(50, min(n_users, n_products) - 1)
        if n_components > 1:
            svd = TruncatedSVD(n_components=n_components, random_state=42)
            U = svd.fit_transform(R)                # (n_users, k)
            sigma = np.diag(svd.singular_values_)    # (k, k)
            Vt = svd.components_                     # (k, n_products)
            self._svd_predictions = U @ sigma @ Vt   # reconstructed matrix
        else:
            self._svd_predictions = R.copy()

        # ── Content-Based: TF-IDF + Category/Brand encoding ──
        products = db.query(Product).filter(Product.deleted_at == None).all()
        self._product_data = []
        texts = []
        categories = set()
        brands = set()

        for p in products:
            self._product_data.append({
                "id": p.id, "name": p.name, "category": p.category or "",
                "brand": p.brand or "", "price": float(p.price or 0),
                "description": p.description or "",
            })
            texts.append(f"{p.name} {p.description or ''} {p.category or ''}")
            categories.add(p.category or "Unknown")
            brands.add(p.brand or "Unknown")

        if texts:
            tfidf = TfidfVectorizer(max_features=500, stop_words="english")
            tfidf_matrix = tfidf.fit_transform(texts).toarray()

            # One-hot encode category + brand
            cat_list = sorted(categories)
            brand_list = sorted(brands)
            cat_idx = {c: i for i, c in enumerate(cat_list)}
            brand_idx = {b: i for i, b in enumerate(brand_list)}

            cat_onehot = np.zeros((len(products), len(cat_list)), dtype=np.float32)
            brand_onehot = np.zeros((len(products), len(brand_list)), dtype=np.float32)

            for i, p in enumerate(self._product_data):
                ci = cat_idx.get(p["category"] or "Unknown", 0)
                bi = brand_idx.get(p["brand"] or "Unknown", 0)
                cat_onehot[i, ci] = 1.0
                brand_onehot[i, bi] = 1.0

            self._product_features = np.hstack([tfidf_matrix, cat_onehot, brand_onehot])
        else:
            self._product_features = np.zeros((1, 1))

        # ── Popularity scores ──
        pop_query = (
            db.query(
                Product.id,
                func.avg(Rating.value).label("avg_r"),
                func.count(Rating.id).label("cnt"),
            )
            .outerjoin(Rating, Rating.product_id == Product.id)
            .filter(Product.deleted_at == None)
            .group_by(Product.id)
            .all()
        )
        self._popularity_scores = {}
        for pid, avg_r, cnt in pop_query:
            score = (float(avg_r or 0) * 0.7) + (min(float(cnt or 0), 100) / 100 * 0.3)
            self._popularity_scores[pid] = score

    # ─── Recommendation Methods ──────────────────────────────────────────────

    def _knn_predict(self, user_idx: int, sim_matrix: np.ndarray, k: int = 20) -> np.ndarray:
        """Predict ratings for unseen items using KNN on a similarity matrix."""
        R = self._rating_matrix
        n_products = R.shape[1]

        sims = sim_matrix[user_idx]
        top_k = np.argsort(sims)[::-1][:k]

        predictions = np.zeros(n_products)
        for j in range(n_products):
            if R[user_idx, j] > 0:
                predictions[j] = -1  # already rated, skip
                continue
            num = 0.0
            den = 0.0
            for neighbor in top_k:
                if R[neighbor, j] > 0 and sims[neighbor] > 0:
                    num += sims[neighbor] * R[neighbor, j]
                    den += abs(sims[neighbor])
            predictions[j] = num / den if den > 0 else 0.0
        return predictions

    def user_based_knn(self, user_id: int, n: int = 10) -> list[int]:
        """User-Based KNN with cosine similarity."""
        ui = self._user_idx.get(user_id)
        if ui is None:
            return []
        preds = self._knn_predict(ui, self._user_sim_cosine)
        top_indices = np.argsort(preds)[::-1][:n]
        return [self._product_ids[i] for i in top_indices if preds[i] > 0]

    def item_based_cosine(self, user_id: int, n: int = 10) -> list[int]:
        """Item-Based Cosine CF."""
        ui = self._user_idx.get(user_id)
        if ui is None:
            return []
        R = self._rating_matrix
        n_products = R.shape[1]
        rated_items = np.where(R[ui] > 0)[0]

        if len(rated_items) == 0:
            return []

        scores = np.zeros(n_products)
        for j in range(n_products):
            if R[ui, j] > 0:
                scores[j] = -1
                continue
            sims_to_rated = self._item_sim_cosine[j, rated_items]
            ratings_of_rated = R[ui, rated_items]
            den = np.sum(np.abs(sims_to_rated))
            if den > 0:
                scores[j] = np.dot(sims_to_rated, ratings_of_rated) / den

        top_indices = np.argsort(scores)[::-1][:n]
        return [self._product_ids[i] for i in top_indices if scores[i] > 0]

    def euclidean_cf(self, user_id: int, n: int = 10) -> list[int]:
        """Euclidean Distance CF."""
        ui = self._user_idx.get(user_id)
        if ui is None:
            return []
        preds = self._knn_predict(ui, self._user_sim_euclidean)
        top_indices = np.argsort(preds)[::-1][:n]
        return [self._product_ids[i] for i in top_indices if preds[i] > 0]

    def svd_recommendations(self, user_id: int, n: int = 10) -> list[int]:
        """SVD Matrix Factorization."""
        ui = self._user_idx.get(user_id)
        if ui is None:
            return []
        R = self._rating_matrix
        preds = self._svd_predictions[ui].copy()
        # Mask already-rated items
        preds[R[ui] > 0] = -1
        top_indices = np.argsort(preds)[::-1][:n]
        return [self._product_ids[i] for i in top_indices if preds[i] > 0]

    def content_based(self, user_id: int, n: int = 10, db: Session = None) -> list[int]:
        """Content-Based using TF-IDF + category/brand features."""
        if self._product_features is None or len(self._product_data) == 0:
            return []

        # Build user profile from liked items
        ui = self._user_idx.get(user_id)
        liked_product_ids = set()

        if ui is not None:
            R = self._rating_matrix
            for j in range(R.shape[1]):
                if R[ui, j] >= 4:
                    liked_product_ids.add(self._product_ids[j])

        # Also add favourites
        if db:
            favs = db.query(Favourite.product_id).filter(Favourite.user_id == user_id).all()
            for (fid,) in favs:
                liked_product_ids.add(fid)

        if len(liked_product_ids) == 0:
            return []

        # Map liked product IDs to indices in product_data
        pd_id_to_idx = {p["id"]: i for i, p in enumerate(self._product_data)}
        liked_indices = [pd_id_to_idx[pid] for pid in liked_product_ids if pid in pd_id_to_idx]

        if len(liked_indices) == 0:
            return []

        # User profile = mean of liked product features
        user_vec = np.mean(self._product_features[liked_indices], axis=0, keepdims=True)

        # Cosine similarity with all products
        sims = cosine_similarity(user_vec, self._product_features)[0]

        # Exclude already-seen products
        seen_ids = liked_product_ids
        if ui is not None:
            R = self._rating_matrix
            for j in range(R.shape[1]):
                if R[ui, j] > 0:
                    seen_ids.add(self._product_ids[j])

        scored = []
        for i, p in enumerate(self._product_data):
            if p["id"] not in seen_ids:
                scored.append((p["id"], sims[i]))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [pid for pid, _ in scored[:n]]

    def popularity_baseline(self, n: int = 10, exclude_ids: set = None) -> list[int]:
        """Popularity-based fallback for cold-start users."""
        exclude = exclude_ids or set()
        scored = [(pid, score) for pid, score in self._popularity_scores.items() if pid not in exclude]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [pid for pid, _ in scored[:n]]

    def hybrid_feed(self, user_id: int, limit: int, db: Session) -> list[int]:
        """
        Hybrid recommendation combining CF and CB methods.
        Cold-start users get popularity baseline.
        """
        self._ensure_fitted(db)

        ui = self._user_idx.get(user_id)

        # Cold start: fewer than 3 ratings
        if ui is None:
            logger.info(f"Cold start for user {user_id} — using popularity baseline")
            return self.popularity_baseline(limit)

        n_ratings = np.sum(self._rating_matrix[ui] > 0)
        if n_ratings < 3:
            logger.info(f"Cold start for user {user_id} ({n_ratings} ratings) — using popularity baseline")
            return self.popularity_baseline(limit)

        # Get recommendations from each method
        cf_results = {
            "user_knn": self.user_based_knn(user_id, limit * 3),
            "item_cosine": self.item_based_cosine(user_id, limit * 3),
            "euclidean": self.euclidean_cf(user_id, limit * 3),
            "svd": self.svd_recommendations(user_id, limit * 3),
        }
        cb_results = self.content_based(user_id, limit * 3, db)

        # Score aggregation: each method votes for products
        product_scores: dict[int, float] = {}

        # CF scores (0.7 weight total, split across 4 methods)
        cf_weight_per_method = 0.7 / 4
        for method_results in cf_results.values():
            for rank, pid in enumerate(method_results):
                score = 1.0 / (rank + 1)  # reciprocal rank
                product_scores[pid] = product_scores.get(pid, 0) + score * cf_weight_per_method

        # CB score (0.3 weight)
        for rank, pid in enumerate(cb_results):
            score = 1.0 / (rank + 1)
            product_scores[pid] = product_scores.get(pid, 0) + score * 0.3

        # Sort by aggregate score
        sorted_products = sorted(product_scores.items(), key=lambda x: x[1], reverse=True)
        result = [pid for pid, _ in sorted_products[:limit]]

        # If not enough results, pad with popularity
        if len(result) < limit:
            existing = set(result)
            popular = self.popularity_baseline(limit, exclude_ids=existing)
            result.extend(popular[:limit - len(result)])

        return result

    def gift_score(self, req, db: Session) -> list[dict]:
        """
        Knowledge-Based Gift Finder with tag scoring.
        """
        self._ensure_fitted(db)

        # ── Activate tags from user answers ──
        activated_tags: dict[str, float] = {}

        def add_tags(tag_list: list[str], weight: float):
            for tag in tag_list:
                activated_tags[tag] = activated_tags.get(tag, 0) + weight

        # Recipient
        recipient = getattr(req, "recipient", "").lower()
        if recipient in RECIPIENT_TAGS:
            add_tags(RECIPIENT_TAGS[recipient], 3.0)

        # Occasion
        occasion = getattr(req, "occasion", "").lower()
        if occasion in OCCASION_TAGS:
            add_tags(OCCASION_TAGS[occasion], 2.0)

        # Personality
        personality = getattr(req, "personality", "").lower()
        if personality in PERSONALITY_TAGS:
            add_tags(PERSONALITY_TAGS[personality], 4.0)

        # Age group
        age_group = getattr(req, "age_group", "").lower()
        if age_group in AGE_TAGS:
            add_tags(AGE_TAGS[age_group], 2.0)

        # Budget
        budget_str = getattr(req, "budget", "any budget").lower()
        budget_limit = BUDGET_MAP.get(budget_str, 99999)

        # Free text keywords
        free_text = getattr(req, "free_text", "") or ""
        keywords = [w.strip().lower() for w in free_text.replace(",", " ").split() if len(w.strip()) > 2]
        for kw in keywords:
            activated_tags[kw] = activated_tags.get(kw, 0) + 5.0

        # ── Score each product ──
        products = db.query(Product).filter(Product.deleted_at == None).all()
        scored = []

        for p in products:
            score = 0.0
            explanation_parts = []
            cat_lower = (p.category or "").lower()
            name_lower = (p.name or "").lower()
            desc_lower = (p.description or "").lower()
            brand_lower = (p.brand or "").lower()
            product_text = f"{cat_lower} {name_lower} {desc_lower} {brand_lower}"

            # Get tags for this product's category
            product_tags = set()
            for cat_key, tags in CATEGORY_TAGS.items():
                if cat_key in cat_lower:
                    product_tags.update(tags)

            # Match activated tags against product tags and text
            for tag, weight in activated_tags.items():
                if tag in product_tags or tag in product_text:
                    score += weight
                    if weight >= 4:
                        explanation_parts.append(f"matches {tag} preference")
                    elif weight >= 3:
                        explanation_parts.append(f"fits {tag} style")

            # Budget penalty
            price = float(p.price or 0)
            if price > budget_limit:
                score -= 10
                explanation_parts.append("over budget")
            else:
                explanation_parts.append(f"within ${budget_limit} budget")

            # Free text keyword matching
            for kw in keywords:
                if kw in product_text:
                    explanation_parts.append(f"contains '{kw}'")

            # Build explanation
            if not explanation_parts:
                explanation = "General recommendation based on popularity."
            else:
                explanation = f"This product {', '.join(explanation_parts[:3])}."

            scored.append({
                "product": p,
                "score": score,
                "match_percent": max(0, min(99, int(50 + score * 3))),
                "explanation": explanation,
            })

        # Sort by score descending, return top 6
        scored.sort(key=lambda x: x["score"], reverse=True)
        return [
            {
                "product": item["product"],
                "match_percent": item["match_percent"],
                "explanation": item["explanation"],
            }
            for item in scored[:6]
        ]

    # ─── Method dispatch for evaluation ──────────────────────────────────────

    def get_recommendations_by_method(self, method: str, user_id: int, n: int, db: Session) -> list[int]:
        """Get top-N recommendations from a specific method."""
        self._ensure_fitted(db)
        method_lower = method.lower()
        if "user" in method_lower and "knn" in method_lower:
            return self.user_based_knn(user_id, n)
        elif "item" in method_lower and "cosine" in method_lower:
            return self.item_based_cosine(user_id, n)
        elif "euclidean" in method_lower:
            return self.euclidean_cf(user_id, n)
        elif "svd" in method_lower:
            return self.svd_recommendations(user_id, n)
        elif "content" in method_lower:
            return self.content_based(user_id, n, db)
        elif "popularity" in method_lower:
            return self.popularity_baseline(n)
        else:
            return self.popularity_baseline(n)

    def predict_rating(self, user_id: int, product_id: int) -> float:
        """Predict a single rating using SVD."""
        ui = self._user_idx.get(user_id)
        pi = self._product_idx.get(product_id)
        if ui is None or pi is None:
            return 3.0  # default
        return float(np.clip(self._svd_predictions[ui, pi], 1, 5))


# ─── Global singleton ────────────────────────────────────────────────────────
rec_engine = RecommendationEngine()
