import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  ADMIN_USER?: string
  ADMIN_PASSWORD?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// 1. 全局中间件：CORS
app.use('/*', cors())

// 2. 全局中间件：错误处理
app.onError((err, c) => {
  console.error(`${err}`)
  return c.text('Internal Server Error', 500)
})

// 3. 登录验证 (简单的 Basic Auth)
// 在实际请求中，前端需要在 Header 中带上 Authorization: Basic <base64(user:pass)>
app.use('/api/*', async (c, next) => {
  // 如果是 OPTIONS 请求（预检），直接放行
  if (c.req.method === 'OPTIONS') {
    return next()
  }

  const auth = basicAuth({
    username: c.env.ADMIN_USER || 'admin',
    password: c.env.ADMIN_PASSWORD || 'password',
  })
  return auth(c, next)
})

// === API 路由 ===

// 检查登录状态
app.get('/api/auth/check', (c) => c.json({ status: 'ok', user: c.env.ADMIN_USER || 'admin' }))

// 获取分类
app.get('/api/categories', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM categories ORDER BY id DESC').all()
  return c.json(results)
})

// 添加分类
app.post('/api/categories', async (c) => {
  const { name, description } = await c.req.json()
  const res = await c.env.DB.prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
    .bind(name, description)
    .run()
  return c.json(res)
})

// 获取物品列表 (包含分类名)
app.get('/api/items', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT items.*, categories.name as category_name 
    FROM items 
    LEFT JOIN categories ON items.category_id = categories.id
    ORDER BY items.id DESC
  `).all()
  return c.json(results)
})

// 添加物品
app.post('/api/items', async (c) => {
  const { category_id, name, supplier, price, stock, image_key } = await c.req.json()
  const res = await c.env.DB.prepare(
    'INSERT INTO items (category_id, name, supplier, price, stock, image_key) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(category_id, name, supplier, price, stock || 0, image_key)
    .run()
  return c.json(res)
})

// 记录出入库 (核心业务)
app.post('/api/transactions', async (c) => {
  const { item_id, type, quantity, date, department, user, note } = await c.req.json()
  
  // 1. 记录交易
  const record = await c.env.DB.prepare(
    'INSERT INTO transactions (item_id, type, quantity, transaction_date, department, user, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(item_id, type, quantity, date, department, user, note)
    .run()

  // 2. 更新库存
  let updateSql = ''
  if (type === 'IN') {
    updateSql = 'UPDATE items SET stock = stock + ? WHERE id = ?'
  } else {
    updateSql = 'UPDATE items SET stock = stock - ? WHERE id = ?'
  }
  
  await c.env.DB.prepare(updateSql).bind(quantity, item_id).run()

  return c.json({ success: true })
})

// 获取交易记录
app.get('/api/transactions', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT transactions.*, items.name as item_name, items.supplier
    FROM transactions
    LEFT JOIN items ON transactions.item_id = items.id
    ORDER BY transactions.transaction_date DESC, transactions.id DESC
  `).all()
  return c.json(results)
})

// R2 图片上传 (简单版：直接通过 Worker 转发 PUT)
// 客户端先 PUT 到这个接口，Worker 再 PUT 到 R2
app.put('/api/upload/:key', async (c) => {
  const key = c.req.param('key')
  const body = await c.req.arrayBuffer()
  
  await c.env.BUCKET.put(key, body)
  
  return c.json({ key, url: `/api/assets/${key}` })
})

// R2 图片获取
app.get('/api/assets/:key', async (c) => {
  const key = c.req.param('key')
  const object = await c.env.BUCKET.get(key)

  if (!object) return c.text('Not Found', 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, {
    headers,
  })
})

export default app
