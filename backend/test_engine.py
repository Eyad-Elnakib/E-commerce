import requests

# Login
r = requests.post('http://localhost:8000/api/auth/login', json={'username': 'rania_nasser_1', 'password': 'Pass1word!'})
print("Login:", r.status_code)
data = r.json()
token = data['access_token']
print("Token:", token[:40] + "...")

# Test Feed
r2 = requests.get('http://localhost:8000/api/recommendations/feed?limit=5', headers={'Authorization': f'Bearer {token}'})
print("\nFeed status:", r2.status_code)
feed = r2.json()
print("Rows:", len(feed.get('rows', [])), "| from_cache:", feed.get('from_cache'))
for row in feed['rows'][:5]:
    print(f"  - {row['name']} (${row.get('price', '?')})")

# Test Metrics Recompute
r3 = requests.post('http://localhost:8000/api/admin/metrics/recompute', headers={'Authorization': f'Bearer {token}'})
print("\nMetrics recompute:", r3.status_code, r3.text[:100])

# Test Global Metrics
r4 = requests.get('http://localhost:8000/api/admin/metrics/global', headers={'Authorization': f'Bearer {token}'})
print("\nGlobal metrics:", r4.status_code)
if r4.status_code == 200:
    metrics = r4.json()
    for m in metrics.get('methods', []):
        print(f"  {m['method']:25s} | P@10={m['precision_at_10']:.4f} | R@10={m['recall_at_10']:.4f} | NDCG={m['ndcg_at_10']:.4f} | RMSE={m.get('rmse', 'N/A')}")
