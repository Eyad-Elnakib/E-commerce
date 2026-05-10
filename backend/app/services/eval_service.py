"""
Real evaluation service — replaces hardcoded mock metrics.
Performs train/test split and computes real Precision@10, Recall@10, NDCG@10, RMSE, Accuracy.
"""
import logging
import math
import numpy as np
from typing import Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Product, User, Rating, Favourite
from app.services.rec_engine import RecommendationEngine

logger = logging.getLogger(__name__)

METHODS = [
    "User-Based KNN",
    "Item-Based Cosine CF",
    "Euclidean Distance CF",
    "SVD",
    "Content-Based",
    "Popularity Baseline",
]


def _dcg(relevances: list[float], k: int = 10) -> float:
    """Compute Discounted Cumulative Gain at position k."""
    dcg = 0.0
    for i, rel in enumerate(relevances[:k]):
        dcg += rel / math.log2(i + 2)  # i+2 because log2(1)=0
    return dcg


def _ndcg(recommended: list[int], relevant: set[int], k: int = 10) -> float:
    """Compute NDCG@k."""
    relevances = [1.0 if pid in relevant else 0.0 for pid in recommended[:k]]
    dcg = _dcg(relevances, k)
    ideal = _dcg(sorted(relevances, reverse=True), k)
    return dcg / ideal if ideal > 0 else 0.0


def run_global_evaluation(include_synthetic: bool, db: Session) -> dict[str, Any]:
    """
    Evaluate all recommendation methods using train/test split.
    Returns real metrics computed from the database.
    """
    # ── Load ratings ──
    query = db.query(Rating)
    if not include_synthetic:
        query = query.filter(Rating.is_synthetic == False)
    all_ratings = query.all()

    if len(all_ratings) < 50:
        logger.warning(f"Only {len(all_ratings)} ratings — returning default metrics")
        return _default_metrics("Insufficient data")

    # ── 70/30 Train/Test split (random) ──
    np.random.seed(42)
    indices = np.arange(len(all_ratings))
    np.random.shuffle(indices)
    split = int(len(indices) * 0.7)
    train_indices = set(indices[:split])
    test_indices = set(indices[split:])

    # Build train data structures
    train_ratings = [all_ratings[i] for i in train_indices]
    test_ratings = [all_ratings[i] for i in test_indices]

    # Build test ground truth: user_id -> set of product_ids they rated highly (>=4)
    test_relevant: dict[int, set[int]] = {}
    test_actual: dict[tuple[int, int], int] = {}
    test_users = set()

    for r in test_ratings:
        test_users.add(r.user_id)
        test_actual[(r.user_id, r.product_id)] = r.value
        if r.value >= 4:
            if r.user_id not in test_relevant:
                test_relevant[r.user_id] = set()
            test_relevant[r.user_id].add(r.product_id)

    # ── Build a temporary engine from training data only ──
    train_engine = RecommendationEngine()
    # We need to manually populate its data from training ratings
    _fit_engine_from_ratings(train_engine, train_ratings, db)

    # ── Evaluate each method ──
    results = []
    for method in METHODS:
        precision_sum = 0.0
        recall_sum = 0.0
        ndcg_sum = 0.0
        rmse_errors = []
        correct_count = 0
        total_predictions = 0
        n_evaluated_users = 0

        for user_id in test_users:
            relevant = test_relevant.get(user_id, set())
            if len(relevant) == 0:
                continue

            # Get top-10 recommendations
            try:
                recs = train_engine.get_recommendations_by_method(method, user_id, 10, db)
            except Exception:
                continue

            if len(recs) == 0:
                continue

            n_evaluated_users += 1

            # Precision@10
            hits = len(set(recs) & relevant)
            precision_sum += hits / min(len(recs), 10)

            # Recall@10
            recall_sum += hits / len(relevant) if len(relevant) > 0 else 0

            # NDCG@10
            ndcg_sum += _ndcg(recs, relevant, 10)

            # RMSE & Accuracy (using SVD predictions for rating prediction)
            for pid in recs:
                actual = test_actual.get((user_id, pid))
                if actual is not None:
                    predicted = train_engine.predict_rating(user_id, pid)
                    rmse_errors.append((predicted - actual) ** 2)
                    if round(predicted) == actual:
                        correct_count += 1
                    total_predictions += 1

        n = max(n_evaluated_users, 1)
        precision = precision_sum / n
        recall = recall_sum / n
        ndcg = ndcg_sum / n
        rmse = math.sqrt(sum(rmse_errors) / len(rmse_errors)) if rmse_errors else None
        accuracy = correct_count / total_predictions if total_predictions > 0 else 0.0

        results.append({
            "method": method,
            "precision_at_10": round(precision, 4),
            "recall_at_10": round(recall, 4),
            "ndcg_at_10": round(ndcg, 4),
            "accuracy": round(accuracy, 4),
            "rmse": round(rmse, 4) if rmse is not None else None,
        })

    return {"methods": results}


def run_user_evaluation(user_id: int, db: Session) -> Optional[dict[str, Any]]:
    """
    Per-user evaluation: return precision and recommended product lists per method.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    # Build engine from full data
    engine = RecommendationEngine()
    engine._ensure_fitted(db)

    # Get user's actual high-rated items
    user_ratings = db.query(Rating).filter(Rating.user_id == user_id, Rating.value >= 4).all()
    relevant = {r.product_id for r in user_ratings}
    favs = db.query(Favourite.product_id).filter(Favourite.user_id == user_id).all()
    for (fid,) in favs:
        relevant.add(fid)

    methods_result = []
    eval_methods = ["User-Based KNN", "Item-Based Cosine CF", "SVD", "Content-Based"]

    for method in eval_methods:
        try:
            rec_ids = engine.get_recommendations_by_method(method, user_id, 10, db)
        except Exception:
            rec_ids = []

        # Calculate precision for this user
        hits = len(set(rec_ids) & relevant) if relevant else 0
        precision = hits / max(len(rec_ids), 1)

        # Fetch actual product objects
        products = []
        if rec_ids:
            product_map = {}
            product_objs = db.query(Product).filter(
                Product.id.in_(rec_ids),
                Product.deleted_at == None
            ).all()
            for p in product_objs:
                product_map[p.id] = {
                    "id": p.id, "name": p.name, "price": float(p.price or 0),
                    "image_file": p.image_file, "category": p.category,
                }
            products = [product_map[pid] for pid in rec_ids if pid in product_map]

        methods_result.append({
            "method": method,
            "precision_at_10": round(precision, 2),
            "list": products,
        })

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else "",
        },
        "methods": methods_result,
    }


def _fit_engine_from_ratings(engine: RecommendationEngine, ratings: list, db: Session):
    """
    Manually fit a RecommendationEngine from a specific set of ratings
    (used for train/test evaluation where we don't want to use ALL ratings).
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as cos_sim
    from sklearn.decomposition import TruncatedSVD
    from scipy.spatial.distance import cdist

    # Collect IDs
    user_id_set = set()
    product_id_set = set()
    for r in ratings:
        user_id_set.add(r.user_id)
        product_id_set.add(r.product_id)

    engine._user_ids = sorted(user_id_set)
    engine._product_ids = sorted(product_id_set)
    engine._user_idx = {uid: i for i, uid in enumerate(engine._user_ids)}
    engine._product_idx = {pid: i for i, pid in enumerate(engine._product_ids)}

    n_users = len(engine._user_ids)
    n_products = len(engine._product_ids)

    if n_users == 0 or n_products == 0:
        engine._rating_matrix = np.zeros((1, 1))
        engine._fitted = True
        return

    # Build rating matrix
    R = np.zeros((n_users, n_products), dtype=np.float32)
    for r in ratings:
        ui = engine._user_idx.get(r.user_id)
        pi = engine._product_idx.get(r.product_id)
        if ui is not None and pi is not None:
            R[ui, pi] = float(r.value)

    engine._rating_matrix = R

    # User-User Cosine
    R_centered = R.copy()
    user_means = np.nanmean(np.where(R > 0, R, np.nan), axis=1)
    user_means = np.nan_to_num(user_means, nan=0.0)
    for i in range(n_users):
        mask = R_centered[i] > 0
        R_centered[i, mask] -= user_means[i]

    engine._user_sim_cosine = cos_sim(R_centered)
    np.fill_diagonal(engine._user_sim_cosine, 0)

    # Item-Item Cosine
    engine._item_sim_cosine = cos_sim(R.T)
    np.fill_diagonal(engine._item_sim_cosine, 0)

    # Euclidean
    dists = cdist(R_centered, R_centered, metric="euclidean")
    engine._user_sim_euclidean = 1.0 / (1.0 + dists)
    np.fill_diagonal(engine._user_sim_euclidean, 0)

    # SVD
    n_comp = min(50, min(n_users, n_products) - 1)
    if n_comp > 1:
        svd = TruncatedSVD(n_components=n_comp, random_state=42)
        U = svd.fit_transform(R)
        sigma = np.diag(svd.singular_values_)
        Vt = svd.components_
        engine._svd_predictions = U @ sigma @ Vt
    else:
        engine._svd_predictions = R.copy()

    # Popularity
    engine._popularity_scores = {}
    for j, pid in enumerate(engine._product_ids):
        col = R[:, j]
        rated = col[col > 0]
        if len(rated) > 0:
            engine._popularity_scores[pid] = float(np.mean(rated)) * 0.7 + min(len(rated), 100) / 100 * 0.3

    # Content-Based features (use full product catalog from DB)
    products = db.query(Product).filter(Product.deleted_at == None).all()
    engine._product_data = []
    texts = []
    for p in products:
        engine._product_data.append({
            "id": p.id, "name": p.name, "category": p.category or "",
            "brand": p.brand or "", "price": float(p.price or 0),
            "description": p.description or "",
        })
        texts.append(f"{p.name} {p.description or ''} {p.category or ''}")

    if texts:
        tfidf = TfidfVectorizer(max_features=500, stop_words="english")
        engine._product_features = tfidf.fit_transform(texts).toarray()
    else:
        engine._product_features = np.zeros((1, 1))

    engine._fitted = True


def _default_metrics(reason: str) -> dict[str, Any]:
    """Return default metrics when there's insufficient data."""
    logger.warning(f"Returning default metrics: {reason}")
    return {
        "methods": [
            {
                "method": method,
                "precision_at_10": 0.0,
                "recall_at_10": 0.0,
                "ndcg_at_10": 0.0,
                "accuracy": 0.0,
                "rmse": None,
            }
            for method in METHODS
        ]
    }
