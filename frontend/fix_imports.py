import os
import re

FRONTEND_DIR = r"C:\Users\Eyad Elnakib\Desktop\recommended project\frontend\src"

fixes = [
    (r"api\\cart\.ts", r"import \{ Product \}", "import type { Product }"),
    (r"api\\metrics\.ts", r"import \{ Product \}", "import type { Product }"),
    (r"api\\telemetry\.ts", r"import \{ Product \}", "import type { Product }"),
    (r"pages\\admin\\MetricsDashboardPage\.tsx", r"import \{ MethodMetrics, GlobalMetrics \}", "import type { MethodMetrics, GlobalMetrics }"),
    (r"pages\\admin\\UserMetricsPage\.tsx", r"import \{ UserSearchResult, UserMetrics \}", "import type { UserSearchResult, UserMetrics }"),
    (r"pages\\BrowsePage\.tsx", r"import \{ Product \}", "import type { Product }"),
    (r"pages\\CartPage\.tsx", r"import \{ cartApi, CartItem \}", "import { cartApi } from '../api/cart'\nimport type { CartItem }"),
    (r"pages\\FeedPage\.tsx", r"import \{ Product \}", "import type { Product }"),
    (r"pages\\OrdersPage\.tsx", r"import \{ ordersApi, Order \}", "import { ordersApi } from '../api/orders'\nimport type { Order }"),
    (r"pages\\ProductDetailPage\.tsx", r"import \{ productsApi, Product \}", "import { productsApi } from '../api/products'\nimport type { Product }"),
    (r"services\\telemetry\.ts", r"import \{ telemetryApi, EventPayload \}", "import { telemetryApi } from '../api/telemetry'\nimport type { EventPayload }"),
    (r"components\\ToastProvider\.tsx", r"const timerRef = useRef<ReturnType<typeof setTimeout>>\(\)", "const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)"),
]

for root, dirs, files in os.walk(FRONTEND_DIR):
    for file in files:
        if not file.endswith(('.ts', '.tsx')):
            continue
        filepath = os.path.join(root, file)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original = content
        
        for pattern_file, search, replace in fixes:
            if re.search(pattern_file.replace('\\\\', '\\'), filepath):
                content = re.sub(search, replace, content)
                
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed {file}")

print("Done fixing verbatimModuleSyntax errors.")
