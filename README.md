# E-Commerce Platform Setup Guide

Welcome to the project! This is a high-end E-commerce platform powered by a sophisticated, custom-built hybrid recommendation engine.

---

## ✨ Key Features

- **Personalized Discovery**: A dynamic home feed that adapts to your behavior using 6 different algorithms.
- **"You Might Also Like"**: Product detail pages show similar products powered by the Item-Cosine Similarity Matrix.
- **Cold-Start Onboarding Wizard**: New users are guided through a 2-step preference quiz (pick categories → pick products) that immediately personalizes their feed using implicit ratings.
- **Adaptive Hybrid Engine**: The hybrid feed dynamically adjusts its CF/CB weight ratio based on how many ratings a user has — new users get 80% content-based, experienced users get 70% collaborative filtering.
- **Advanced Gift Finder**: A multi-step wizard that uses knowledge-based filtering to find the perfect gift.
- **Admin Command Center**: Complete dashboard for managing products and analyzing recommendation accuracy.
- **Scientific Evaluation**: Real-time computation of Precision, Recall, NDCG, and RMSE metrics.
- **Interactive 3D UI**: Modern, premium landing page with 3D flipping animations and smooth transitions.
- **Full Shopping Flow**: Secure authentication, product management, favorites, cart, and order tracking.

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts (for analytics).
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy (ORM).
- **Database**: SQLite (SQL-based persistence).
- **Machine Learning**: Scikit-learn (TF-IDF, SVD, KNN), NumPy, SciPy.

---

## 🚀 Setup Guide

This guide will help you get the entire application (both the React Frontend and the Python Backend) running perfectly on your local machine.

## Prerequisites
Before you start, you need to have the following installed on your computer:
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Python** (v3.10 or higher) - [Download here](https://www.python.org/downloads/)
3. **Git** (optional, but recommended)

---

## 1. Setting up the Backend (Python FastAPI)

The backend handles the database, authentication, and the recommendation engine.

1. Open your terminal or command prompt.
2. Navigate into the `backend` folder:
   ```bash
   cd backend
   ```
3. **Create a virtual environment** (this keeps dependencies isolated):
   ```bash
   python -m venv venv
   ```
4. **Activate the virtual environment**:
   - **Windows**: `venv\Scripts\activate`
   - **Mac/Linux**: `source venv/bin/activate`
5. **Install the required packages**:
   ```bash
   pip install -r requirements.txt
   ```
6. *(Optional)* **Generate the Database**:
   If you don't already have the `app.db` file, you can generate sample data by running:
   ```bash
   python generate_sample_data.py
   ```
7. **Start the backend server**:
   ```bash
   python app.py
   ```
   *The backend should now be running, typically on `http://localhost:8000` or `http://127.0.0.1:8000`.*

---

## 2. Setting up the Frontend (React + TypeScript + Vite)

The frontend is the visual user interface, built with React and Tailwind CSS.

1. Open a **new** terminal window (keep the backend running in the first one).
2. Navigate into the `frontend` folder:
   ```bash
   cd frontend
   ```
3. **Install the Node.js packages**:
   ```bash
   npm install
   ```
4. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
5. **Open the website**:
   Look at the terminal output. It will usually give you a local URL (e.g., `http://localhost:5173/`). Copy and paste that into your web browser.

---

## Troubleshooting

- **"Command not found: npm"** -> Make sure Node.js is installed and your computer has been restarted.
- **"Command not found: python"** -> Make sure Python is installed. On some Macs/Linux, you might need to type `python3` instead of `python`, and `pip3` instead of `pip`.
- **Database/Login Errors** -> Make sure your backend terminal is running without errors and that the `app.db` file exists.

Enjoy the application!

---

## 🚀 How the Recommendation System Works (In Depth)

This project implements a **multi-layered, hybrid recommendation engine** with 6 distinct methods, combining them intelligently to provide personalized shopping experiences. Below is a complete explanation of every algorithm, every matrix, and how the system makes decisions.

---

### Step 1: Building the Data Foundation (The Rating Matrix)

When the engine starts, it loads **all user ratings** and **all favourites** from the database and constructs the core data structure:

**The User-Item Rating Matrix (R)**

```
              Product₁  Product₂  Product₃  Product₄  ...  Productₘ
User₁      [   5         0         3         0              4    ]
User₂      [   0         4         0         5              0    ]
User₃      [   2         0         5         0              0    ]
  ...
Userₙ      [   0         3         0         4              5    ]
```

- **Rows** = Users, **Columns** = Products
- Each cell = the rating a user gave to a product (1-5 stars)
- **0** means the user has NOT rated that product (this is what we want to predict!)
- **Favourites** are automatically treated as an implicit **5-star rating** (if the user hasn't already rated the item)

This matrix `R` has dimensions `(n_users × n_products)` and is typically **very sparse** (most users only rate a small fraction of all products).

---

### Step 2: Collaborative Filtering (CF) — "Users who liked X also liked Y"

CF methods work directly on the Rating Matrix to find patterns. The system uses **4 different CF approaches**:

#### 2.1 User-Based KNN (K-Nearest Neighbors)

**Idea**: Find users with similar taste, then recommend what those similar users liked.

**Step-by-step process:**

1. **Mean-center** the rating matrix: For each user, subtract their average rating from all their scores. This removes bias (some users always rate high, others always rate low).

2. **Compute User-User Cosine Similarity Matrix:**
   ```
   Cosine Similarity(User_A, User_B) = (A · B) / (||A|| × ||B||)
   ```
   This produces an `(n_users × n_users)` matrix where each cell tells how similar two users are (0 = no similarity, 1 = identical taste).

3. **Predict ratings**: For a target user, find the **K=20 most similar neighbors**. For each unrated product, predict the rating using a weighted average:
   ```
   Predicted_Rating(user, product) = Σ(similarity × neighbor_rating) / Σ(|similarity|)
   ```

4. **Return the top-N** products with the highest predicted ratings.

#### 2.2 Item-Based Cosine CF

**Idea**: Instead of finding similar *users*, find similar *products*.

**Step-by-step process:**

1. **Transpose** the rating matrix to get `R^T` with dimensions `(n_products × n_users)`.

2. **Compute Item-Item Cosine Similarity Matrix:**
   ```
   Item Similarity(Item_A, Item_B) = cosine_similarity(column_A, column_B)
   ```
   This produces an `(n_products × n_products)` matrix.

3. **Score unrated items**: For each unrated product `j`, look at all products the user HAS rated. Compute a weighted sum of their similarities to product `j`:
   ```
   Score(j) = Σ(item_similarity(j, rated_item) × user_rating(rated_item)) / Σ(|similarities|)
   ```

4. **Return the top-N** products with the highest scores.

#### 2.3 Euclidean Distance CF

**Idea**: Same as User-Based KNN, but using **Euclidean Distance** instead of Cosine Similarity to measure user similarity.

```
Euclidean Distance(A, B) = √( Σ(Aᵢ - Bᵢ)² )
Similarity = 1 / (1 + distance)
```

- A distance of **0** = identical users → similarity = **1.0**
- A large distance = very different users → similarity approaches **0.0**

The prediction step is identical to User-Based KNN, just using this different similarity matrix.

#### 2.4 SVD (Singular Value Decomposition) — Matrix Factorization

**Idea**: Compress the entire rating matrix into hidden "latent factors" (e.g., "likes action movies" or "prefers budget items") and reconstruct it to fill in the blanks.

**Step-by-step process:**

1. **Decompose** the rating matrix `R` into three smaller matrices:
   ```
   R ≈ U × Σ × V^T
   ```
   Where:
   - `U` = User-factor matrix `(n_users × k)` — each user's affinity for k hidden factors
   - `Σ` = Diagonal matrix of singular values `(k × k)` — the strength of each factor
   - `V^T` = Product-factor matrix `(k × n_products)` — each product's association with k hidden factors
   - `k = 50` (or less if the data is small)

2. **Reconstruct** the full matrix by multiplying them back: `R_predicted = U × Σ × V^T`

3. This reconstructed matrix now has **predictions for every empty cell** (previously 0). Extract the highest predicted values for unrated items.

**Why it works**: SVD discovers hidden patterns. If User₁ rated products A, B, C highly, and User₂ rated A and B highly, SVD infers that User₂ will probably also like C — even if they've never interacted.

---

### Step 3: Content-Based Filtering (CB) — "Similar products to what you liked"

Unlike CF which uses other users' behavior, Content-Based analyzes the **properties of the products themselves**.

**Step-by-step process:**

1. **Build product text**: For each product, concatenate: `name + description + category`

2. **TF-IDF Vectorization** (Term Frequency - Inverse Document Frequency):
   - Converts text into numerical vectors
   - Common words like "the" get LOW weight
   - Unique/distinctive words like "wireless" or "organic" get HIGH weight
   - Produces a matrix of dimensions `(n_products × 500)` (limited to 500 features)

3. **One-Hot Encoding**: Add binary columns for each Category and Brand:
   ```
   Product features = [TF-IDF vector | Category one-hot | Brand one-hot]
   ```

4. **Build User Profile**: Average the feature vectors of all products the user rated **≥ 4 stars** or **favourited**:
   ```
   User Profile = mean(feature vectors of liked products)
   ```

5. **Score all products**: Compute cosine similarity between the user profile vector and every product's feature vector. Recommend the highest-scoring unseen products.

**Important**: If a user has no ratings ≥ 4, Content-Based has nothing to build a profile from and returns empty results.

---

### Step 4: Popularity Baseline — Cold Start Fallback

**Problem**: New users have no ratings, so CF and CB methods can't work. This is called the **"Cold Start Problem"**.

**Solution**: Recommend the most popular products overall.

```
Popularity Score = (average_rating × 0.7) + (min(rating_count, 100) / 100 × 0.3)
```

This balances quality (high average) with confidence (enough ratings to trust).

---

### Step 5: The Hybrid Feed — Combining Everything (Adaptive Weights)

The main recommendation feed uses **Hybrid Fusion** to merge all methods into one final list. The weights **adapt dynamically** based on how much data the system has about each user.

**The formula:**

```
For each product:
  CF_Score = Σ (1/(rank+1) × cf_weight_per_method)    ← from each of the 4 CF methods
  CB_Score = (1/(rank+1)) × cb_total_weight             ← from Content-Based
  Category_Boost = 0.5 (if product is in user's favorite categories)
  Final_Score = CF_Score + CB_Score + Category_Boost
```

**Dynamic Weight Breakdown (based on user rating count):**

| User State | # Ratings | CF Weight | CB Weight | Reasoning |
|---|---|---|---|---|
| **New user (post-onboarding)** | 1–4 | 0.20 (20%) | 0.80 (80%) | CF needs more data; lean on content similarity |
| **Active user** | 5+ | 0.70 (70%) | 0.30 (30%) | CF is now reliable; standard hybrid weights |
| **No ratings at all** | 0 | 0.00 (0%) | 0.00 (0%) | Falls back to Popularity Baseline entirely |

**Category Boost (New):** After onboarding, the system identifies your favorite categories from your high-rated products (≥ 4 stars). Every product in those categories gets a **+0.5 flat bonus** to its hybrid score. This ensures your Top Picks immediately reflect your onboarding choices.

**Why Reciprocal Rank Fusion?** A product ranked #1 in a method gets a score of `1/(1+1) = 0.5`, while a product ranked #10 gets `1/(10+1) = 0.09`. Products appearing in **multiple methods** accumulate scores, naturally floating to the top of the final list.

If the hybrid result has fewer items than needed, the remaining slots are filled with **Popularity Baseline** recommendations.

---

### Step 6: Knowledge-Based Gift Finder — "Tell me about the person"

The Gift Finder is fundamentally different from all other methods. It does **NOT use ratings or user history**. Instead, it uses a **tag-based scoring system** driven by a questionnaire.

**How it works:**

1. The user answers questions about: **Recipient** (Mom, Dad, Friend...), **Occasion** (Birthday, Holiday...), **Personality** (Techie, Bookworm...), **Age Group**, and **Budget**.

2. Each answer activates a set of **tags** with weights:
   ```
   Recipient = "Mom"       → tags: home(3.0), self-care(3.0), kitchen(3.0), wellness(3.0)
   Personality = "Techie"   → tags: tech(4.0), gadgets(4.0), electronics(4.0)
   Occasion = "Birthday"    → tags: fun(2.0), luxury(2.0), entertainment(2.0)
   ```

3. Each product's category is also mapped to tags:
   ```
   Category "Electronics"   → tags: tech, gadgets, electronics
   Category "Beauty"        → tags: self-care, beauty, luxury
   ```

4. **Score each product**: For every activated tag, check if it matches the product's tags or appears in the product's name/description. Accumulate the weights.

5. **Budget filter**: Products over the budget limit get a **-10 penalty**.

6. Return the **top 6** products sorted by score, each with a human-readable explanation (e.g., "This product matches tech preference, fits gadgets style, within $50 budget").

**Why is the Gift Finder NOT in the evaluation metrics?** Because it doesn't predict ratings from history — it matches products to explicit user input. Standard metrics like Precision@10 and RMSE don't apply to rule-based systems.

---

### Method Overlap Analysis (Jaccard Similarity)

The admin dashboard shows a **Method Overlap Matrix** comparing how different methods relate to each other using Jaccard Similarity:

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

Where A and B are the sets of recommended products from two different methods.

**Example interpretation:**

| | User KNN | Item CF | SVD | Content-Based |
|---|---|---|---|---|
| **User KNN** | — | 0.00 | 0.11 | 0.00 |
| **Item CF** | 0.00 | — | 0.00 | 0.00 |
| **SVD** | 0.11 | 0.00 | — | 0.05 |
| **Content-Based** | 0.00 | 0.00 | 0.05 | — |

**What does this mean?**
- **0.00** = The two methods recommend **completely different products** (zero overlap)
- **0.11** = About 1 product overlaps in their top-10 lists
- **Low overlap is GOOD** — it means each method captures different aspects of the user's taste, making the hybrid combination richer and more diverse
- **User KNN ↔ SVD (0.11)**: Both work on the same rating matrix, so they share some overlap
- **SVD ↔ Content-Based (0.05)**: Tiny overlap — SVD found a product that also matched content features by coincidence
- **Item CF ↔ everything (0.00)**: Item CF captures unique product-to-product relationships that no other method sees

---

### Cold Start Handling (Enhanced with Onboarding Wizard)

The cold start problem is now addressed at **two levels**: an onboarding quiz that creates immediate data, and an adaptive engine that adjusts its strategy based on available data.

#### The Onboarding Wizard (New Feature)

When a new user creates an account, they are automatically redirected to a **2-step preference quiz** before accessing the feed:

| Step | What the User Does | What the System Creates |
|---|---|---|
| **Step 1** | Select favorite categories (e.g., Music, Electronics) from an interactive grid | Stores category preferences |
| **Step 2** | Like specific products (up to 12 shown per category) from their chosen categories | Creates **5-star implicit ratings** for liked products + **4-star implicit ratings** for 2 random products per selected category |

**How it works technically:**
- The `POST /api/auth/onboarding` endpoint receives the user's selections
- For each **liked product**: Creates a `Rating(value=5)` + adds to `Favourites`
- For each **selected category**: Picks 2 random products the user didn't explicitly like and creates `Rating(value=4)` entries
- Sets `user.onboarding_completed = True` in the database
- **Invalidates** the recommendation engine cache (`rec_engine.invalidate()`) so the next feed request triggers a refit with the new data

**Result:** A user who picks 1 category and likes 3 products ends up with ~5 ratings — enough for the hybrid engine to generate personalized results immediately.

#### Adaptive Cold Start Strategy

| User State | # of Ratings | Strategy Used |
|---|---|---|
| **Brand new (no onboarding)** | 0 | Popularity Baseline only |
| **Just onboarded** | 1-4 | Adaptive Hybrid: 80% Content-Based + 20% CF + Category Boost |
| **Active user** | 5+ | Full Hybrid: 70% CF + 30% CB |

#### Smart Fallback for Empty Rows

If a specific algorithm (e.g., User-KNN) returns no results for a new user, the system doesn't just show random popular items anymore. Instead, it:
1. Queries the user's **high-rated categories** from the database
2. Fetches popular products **within those categories**
3. Only falls back to global popularity if no category matches exist

This ensures every row on the feed page feels relevant to the user's stated preferences.

---

### Performance Metrics (How we evaluate the system)

The engine is evaluated using a **70/30 Train/Test split** — 70% of ratings are used to train the model, and 30% are held back to test predictions.

| Metric | What it measures | Formula |
|---|---|---|
| **Precision@10** | Of the 10 recommended items, how many did the user actually like? | `hits / 10` |
| **Recall@10** | Of ALL items the user liked, how many did we successfully recommend? | `hits / total_relevant` |
| **NDCG@10** | Are the best items at the TOP of the list? (position-aware) | `DCG / ideal_DCG` |
| **RMSE** | How close are our predicted star ratings to actual ratings? | `√(mean(predicted - actual)²)` |
| **Accuracy** | How often does the rounded predicted rating match exactly? | `correct / total` |

Lower RMSE = better prediction accuracy. Higher Precision/Recall/NDCG = better recommendation quality.

---

## 📋 Frequently Asked Questions

### Q: How many recommendation methods does this system use?

We use a total of **7 distinct recommendation methods**, combined into a **Hybrid System**:

| # | Method | Type |
|---|--------|------|
| 1 | User-Based KNN | Collaborative Filtering |
| 2 | Item-Based Cosine | Collaborative Filtering |
| 3 | Euclidean Distance CF | Collaborative Filtering |
| 4 | SVD (Matrix Factorization) | Collaborative Filtering |
| 5 | Content-Based (TF-IDF) | Content-Based Filtering |
| 6 | Popularity Baseline | Popularity / Cold-Start Fallback |
| 7 | Gift Finder (Knowledge-Based) | Rule-Based / Tag Scoring |
| 8 | Similar Products (Item-Similarity) | Item-Cosine Similarity (Product Page) |
| 🧠 | **Hybrid Feed** | Adaptive Fusion of methods 1-6 |

---

### Q: Where does each method exist in the codebase?

All recommendation logic lives in `backend/app/services/rec_engine.py`:

| # | Method | Function | Description |
|---|--------|----------|-------------|
| 1 | User-Based KNN | `user_based_knn()` | Finds users with similar taste |
| 2 | Item-Based Cosine | `item_based_cosine()` | Finds items rated similarly |
| 3 | Euclidean CF | `euclidean_cf()` | Like KNN but with Euclidean distance |
| 4 | SVD | `svd_recommendations()` | Matrix factorization to predict ratings |
| 5 | Content-Based | `content_based()` | TF-IDF + one-hot feature matching |
| 6 | Popularity Baseline | `popularity_baseline()` | Trending/popular items fallback |
| 7 | Gift Finder | `gift_score()` | Tag-based scoring from questionnaire |
| 8 | **Similar Products** | `similar_products()` | Item-Cosine matrix lookup for product pages |
| 🧠 | Hybrid Feed | `hybrid_feed()` | Adaptive fusion with dynamic CF/CB weights |

The evaluation logic lives in `backend/app/services/eval_service.py`:
- **Global evaluation**: Tests 6 methods
- **User evaluation**: Tests 4 methods

**Onboarding logic** lives in `backend/app/routers/auth.py`:
- `POST /api/auth/onboarding` — Saves preferences + creates implicit ratings

**Similar Products API** lives in `backend/app/routers/products.py`:
- `GET /api/products/{id}/similar` — Returns top 8 similar products

---

### Q: Why don't all 7 methods appear in the Global and User evaluation matrices?

**Global Evaluation Matrix** shows **6 rows** (all except Gift Finder):

| Method | In Global? | In User? | Why excluded? |
|--------|:---:|:---:|------|
| User-Based KNN | ✅ | ✅ | Core CF method |
| Item-Based Cosine | ✅ | ✅ | Core CF method |
| Euclidean Distance | ✅ | ❌ | Nearly identical to User-KNN (same logic, different distance formula). Redundant in per-user view. |
| SVD | ✅ | ✅ | Core CF method |
| Content-Based | ✅ | ✅ | Core CB method |
| Popularity Baseline | ✅ | ❌ | Recommends the **same products for everyone** — no personalization to evaluate per-user. |
| Gift Finder | ❌ | ❌ | **Not a predictive model** — requires questionnaire input (recipient, occasion, etc.), not rating history. Standard metrics like Precision/Recall don't apply to rule-based systems. |
| Hybrid Feed | ❌ | ❌ | It's a **combination** of the other methods, not a standalone algorithm. Evaluating it separately would be like grading the average of all test scores as its own test. |

---

### Q: What is the Popularity Baseline?

The Popularity Baseline is the simplest form of recommendation. It recommends products that are **generally loved by everyone**, rather than products personalized to a specific user. Think of it as the **"Top Charts"** or **"Trending Now"** section.

**How it calculates the score:**
```
Popularity Score = (average_rating × 0.7) + (min(rating_count, 100) / 100 × 0.3)
```

- **Average Rating (70%)**: Does the product have high stars (e.g., 4.5 or 5)?
- **Number of Reviews (30%)**: How many people actually rated it? This prevents a product with one 5-star rating from beating a product with a thousand 4.8-star ratings.

**Why we need it:**
It solves the **"Cold Start Problem"**:
- **New Users**: If you just joined the site, the system knows nothing about you. It can't use KNN or SVD because you haven't rated anything. So, it shows the most popular items instead.
- **Safety Net**: If the advanced methods can't find enough similar users to generate 10 recommendations, the system fills the empty slots with popular items so you never see an empty screen.

---

### Q: Where do these methods appear on the actual website?

| Website Page | What the user sees | Methods running behind it |
|---|---|---|
| **Home Feed** | "Recommended for You" product rows | **Adaptive Hybrid Feed** = KNN + Item-CF + Euclidean + SVD + Content-Based + Popularity + Category Boost |
| **Product Detail Page** | "✨ You Might Also Like" section below the product | **Item-Cosine Similarity Matrix** — `similar_products()` |
| **Onboarding (New Users)** | 2-step preference quiz: Pick categories → Pick products | Creates implicit 5★ and 4★ ratings to bootstrap the engine |
| **Gift Finder** | Multi-step questionnaire → matched gifts with explanations | **Knowledge-Based** (tag scoring) |
| **Admin → Global Evaluation** | Metrics table with Precision, Recall, NDCG, RMSE | 6 methods evaluated side-by-side |
| **Admin → User Evaluation** | Per-user metrics + Jaccard overlap matrix | 4 methods evaluated |
| **Browse / Categories** | Products filtered by category | No recommendation method (manual browsing) |

---

### Q: The Feed page shows 7 rows — but there are only 6 methods. Why?

The **Feed Page** organizes the Hybrid results into multiple visual rows to create a rich, engaging experience:

| Row | Section Title | Method(s) Powering It |
|---|---|---|
| 1 | "Top Picks for You" | Best results from Hybrid fusion (all methods combined) |
| 2 | "Because you liked [Category]" | Content-Based results |
| 3 | "Similar to your Favourites" | Item-Based Cosine results |
| 4 | "Trending Now" | Popularity Baseline |
| 5 | "People like you also bought" | User-Based KNN results |
| 6 | "Hidden Gems" | SVD Matrix Factorization results |
| 7 | "Explore More" | General mix / padding |

**The key difference:**
- The **Evaluation Matrices** (Admin panel) show the **raw algorithms** — the math behind each method. You see 6 rows because there are 6 testable algorithms.
- The **Feed Page** shows the **user experience** — the design. It uses those same 6 algorithms but presents them as 7 visual sections to fill the page.

**Analogy**: Think of a restaurant:
- The **Matrix** is the **Chef's Recipe List** (6 ingredients). You test each ingredient separately to see which is best.
- The **Feed** is the **7-Course Meal** served to the guest. The chef uses those same 6 ingredients to create 7 different dishes.

---

### Q: Why is the Gift Finder on a separate page?

The Gift Finder is fundamentally different from all other methods:
- **Other methods** work **passively** — they look at your past ratings/favourites and generate recommendations automatically without any input.
- **Gift Finder** works **actively** — it requires you to **answer a questionnaire** (Who is the gift for? What's the occasion? What's their personality? What's the budget?).

Because it needs explicit user input, it can't be embedded in the automatic Feed page. It has its own dedicated multi-step wizard page where the user fills out the form, and the tag-scoring engine runs only after submission.

---

## 🆕 New Features Added (Latest Session)

The following features were implemented to enhance the recommendation system's personalization and solve the Cold Start Problem.

---

### Feature 1: "You Might Also Like" on Product Pages

**Problem:** When a user views a product detail page, there was no way to discover similar products.

**Solution:** Added a "✨ You Might Also Like" section at the bottom of every product detail page that shows 8 similar products.

**How it works:**
1. The system already has a precomputed **Item-Cosine Similarity Matrix** of dimensions `(n_products × n_products)`
2. When you view Product X, the engine looks up row X in this matrix
3. It sorts all other products by their similarity score to Product X (descending)
4. Returns the top 8 most similar products

**Technical implementation:**
| Component | File | What it does |
|---|---|---|
| Engine method | `rec_engine.py` → `similar_products()` | Queries the item-cosine similarity matrix |
| API endpoint | `products.py` → `GET /api/products/{id}/similar` | Serves the similar product list |
| Frontend API | `products.ts` → `getSimilarProducts()` | Fetches data from the API |
| UI component | `ProductDetailPage.tsx` | Renders the "You Might Also Like" section with hover-zoom cards |

**Math behind it:**
```
Similarity(Product_A, Product_B) = cosine_similarity(ratings_column_A, ratings_column_B)
```
Products that tend to be rated by the same users in the same way will have high similarity.

---

### Feature 2: Cold-Start Onboarding Wizard

**Problem:** The "Cold Start Problem" — new users have zero ratings, so all recommendation methods fail. They only see generic popular items.

**Solution:** A 2-step onboarding quiz that runs immediately after account creation, collecting enough preference data to bootstrap the recommendation engine.

**User Flow:**
```
Register → Login → Onboarding Quiz (Step 1: Categories → Step 2: Products) → Personalized Feed
```

**Step 1 — Pick Favorite Categories:**
- Displays all available categories as an interactive grid with emojis
- User clicks to select/deselect categories they're interested in
- Must select at least 1 to proceed

**Step 2 — Like Specific Products:**
- Shows up to 12 products per selected category
- User clicks to "heart" products they like
- The more they pick, the better their recommendations

**What happens when they click "Finish Setup":**

| Action | Rating Created | Purpose |
|---|---|---|
| User liked Product X | `Rating(user, X, value=5)` + `Favourite(user, X)` | Strong positive signal |
| User selected Category C (but didn't like specific products in C) | `Rating(user, random_product_in_C, value=4)` × 2 | Ensures the engine has category-level data |
| Onboarding completed | `user.onboarding_completed = True` | Prevents showing the quiz again |
| Cache invalidated | `rec_engine.invalidate()` | Forces engine refit with new ratings |

**Technical implementation:**
| Component | File | What it does |
|---|---|---|
| Database field | `models.py` → `User.onboarding_completed` | Boolean flag to track quiz completion |
| Backend endpoint | `auth.py` → `POST /api/auth/onboarding` | Saves preferences as implicit ratings |
| Frontend page | `OnboardingPage.tsx` | The 2-step interactive quiz UI |
| Auth redirect | `AuthPage.tsx` → `onSubmit()` | Redirects new non-admin users to `/onboarding` |
| Auth store | `authStore.ts` → `needsOnboarding()` | State helper to check onboarding status |
| Schema | `schemas.py` → `OnboardingRequest` | Validates the quiz submission payload |

---

### Feature 3: Adaptive Hybrid Weights

**Problem:** The original hybrid feed used fixed weights (70% CF, 30% CB) for all users. But for new users with only 2-3 ratings, CF methods produce unreliable results.

**Solution:** The hybrid engine now dynamically adjusts its weights based on how many ratings a user has.

```python
# Dynamic weight calculation
if n_ratings >= 5:
    cf_weight = 0.70   # Experienced user: trust collaborative filtering
    cb_weight = 0.30
elif n_ratings > 0:
    cf_weight = 0.20   # New user: lean heavily on content matching
    cb_weight = 0.80
else:
    cf_weight = 0.00   # No data: popularity baseline only
    cb_weight = 0.00
```

**Additionally**, a **Category Boost** of +0.5 is applied to all products in the user's favorite categories (determined from their high-rated products), ensuring the feed immediately reflects their onboarding choices.

---

### Feature 4: Smart Category Fallbacks

**Problem:** When an algorithm (e.g., User-KNN) returns no results for a new user, the system previously fell back to random popular items — which felt generic.

**Solution:** The fallback now queries the user's favorite categories first:

```
Algorithm returns empty?
  → Query user's high-rated categories from DB
  → Show popular items FROM THOSE CATEGORIES
  → If still empty → Global popularity baseline
```

This ensures that even the fallback rows feel personalized to the user's stated preferences.
