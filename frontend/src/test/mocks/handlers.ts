import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/auth/check-username', ({ request }) => {
    const url = new URL(request.url)
    const value = url.searchParams.get('value')
    
    if (value === 'taken') {
      return HttpResponse.json({ available: false })
    }
    return HttpResponse.json({ available: true })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const data = await request.json() as any
    if (data.username === 'taken' || data.username === 'server_taken_user') {
      return HttpResponse.json(
        { detail: 'Username is already taken' },
        { status: 409 }
      )
    }
    if (data.email === 'taken@example.com') {
      return HttpResponse.json(
        { detail: 'Email is already taken' },
        { status: 409 }
      )
    }
    return HttpResponse.json(
      {
        id: 1,
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const data = await request.json() as any
    if (data.username === 'wrong') {
      return HttpResponse.json(
        { detail: 'Invalid username or password' },
        { status: 401 }
      )
    }
    if (data.username === 'ratelimited') {
      return HttpResponse.json(
        { detail: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '5' } }
      )
    }
    return HttpResponse.json({
      access_token: 'fake-jwt-token',
      token_type: 'bearer',
      expires_in: 86400,
      user: {
        id: 1,
        username: data.username,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        created_at: new Date().toISOString(),
      },
    })
  }),

  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Endpoint to verify authorization header logic (Feature A2/A3 tests)
  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (authHeader === 'Bearer fake-jwt-token') {
      return HttpResponse.json({ id: 1, username: 'testuser' })
    }
    return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
  }),

  // Products handlers (B2, B3)
  http.get('/api/products', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    
    if (page === 1) {
      return HttpResponse.json({
        data: [
          { id: 1, name: 'Product 1', price: 10.0, stock: 5, category: 'Tech' },
          { id: 2, name: 'Product 2', price: 20.0, stock: 0, category: 'Tech' },
        ],
        meta: { page: 1, page_size: 2, total: 3, has_more: true }
      })
    } else {
      return HttpResponse.json({
        data: [
          { id: 3, name: 'Product 3', price: 30.0, stock: 10, category: 'Home' },
        ],
        meta: { page: 2, page_size: 2, total: 3, has_more: false }
      })
    }
  }),

  http.get('/api/products/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({
      id: parseInt(params.id as string),
      name: 'Product Details Model',
      brand: 'TestBrand',
      price: 15.50,
      description: 'A detailed description',
      avg_rating: 4.5,
      stock: 12,
      category: 'Test',
      image_file: null,
      is_favourited: false,
      is_in_cart: false
    })
  }),

  // Group C: Favourites, Telemetry, Recommendations
  http.post('/api/favourites/:id', () => {
    return HttpResponse.json({ status: 'added' }, { status: 201 })
  }),
  http.delete('/api/favourites/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/events', () => {
    return HttpResponse.json({ status: 'ingested' })
  }),
  http.get('/api/recommendations/feed', () => {
    return HttpResponse.json({
      rows: [
        { id: 10, name: 'Rec Product 1', price: 9.99, stock: 10, is_favourited: false, is_in_cart: false }
      ],
      generated_at: new Date().toISOString(),
      from_cache: false
    })
  }),
  http.post('/api/recommendations/gift', () => {
    return HttpResponse.json({
      items: [
        {
          product: { id: 11, name: 'Gift Product', price: 25.00, stock: 5, is_favourited: false, is_in_cart: false },
          match_percent: 95,
          explanation: 'Perfect match for testing.'
        }
      ]
    })
  }),

  // Group C: Cart and Orders
  http.get('/api/cart', () => {
    return HttpResponse.json([
      { id: 1, product_id: 1, quantity: 2, price_at_add: 10.0, product: { id: 1, name: 'Product 1', price: 10.0, stock: 5, category: 'Tech' }, created_at: new Date().toISOString() }
    ])
  }),
  http.post('/api/cart', () => {
    return HttpResponse.json({ status: 'added' }, { status: 201 })
  }),
  http.put('/api/cart/:id', async ({ request }) => {
    const data = await request.json() as any
    if (data.quantity === 0) return new HttpResponse(null, { status: 204 })
    return HttpResponse.json({ id: 1, product_id: 1, quantity: data.quantity, price_at_add: 10.0, product: { id: 1, name: 'Product 1', price: 10.0, stock: 5, category: 'Tech' } })
  }),
  http.post('/api/orders', () => {
    return HttpResponse.json({ id: 1, status: 'confirmed', total: 20.0, payment_method: 'card', items: [], created_at: new Date().toISOString() }, { status: 201 })
  }),
  http.get('/api/orders', () => {
    return HttpResponse.json([
      { id: 1, status: 'confirmed', total: 20.0, payment_method: 'card', items: [{ id: 1, product_id: 1, quantity: 2, price_at_purchase: 10.0 }], created_at: new Date().toISOString() }
    ])
  })
]
