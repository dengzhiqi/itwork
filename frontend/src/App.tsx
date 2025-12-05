import { useState, useEffect } from 'react'
import { api } from './api'
import { Package, Plus, Minus, History, Settings, LogOut, Search, Upload } from 'lucide-react'

// 类型定义
type Category = { id: number; name: string; description: string }
type Item = { id: number; category_id: number; category_name?: string; name: string; supplier: string; price: number; stock: number; image_key?: string }
type Transaction = { id: number; item_name: string; supplier?: string; type: 'IN' | 'OUT'; quantity: number; transaction_date: string; department: string; user: string; note: string }

function App() {
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'))
  const [pass, setPass] = useState<string | null>(localStorage.getItem('pass'))
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'history'>('inventory')

  // 数据状态
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  // 表单状态
  const [showAddItem, setShowAddItem] = useState(false)
  const [showTransaction, setShowTransaction] = useState<{ type: 'IN' | 'OUT', item: Item } | null>(null)
  
  // 登录表单
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // 初始化加载
  useEffect(() => {
    if (user && pass) refreshData()
  }, [user, pass])

  const refreshData = async () => {
    setLoading(true)
    try {
      const [cats, its, trans] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/items'),
        api.get('/api/transactions')
      ])
      setCategories(cats)
      setItems(its)
      setTransactions(trans)
    } catch (e) {
      alert('加载失败或认证过期，请重新登录')
      handleLogout()
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('user', loginUser)
    localStorage.setItem('pass', loginPass)
    setUser(loginUser)
    setPass(loginPass)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('pass')
    setUser(null)
    setPass(null)
  }

  // --- 业务操作 ---

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    // 图片上传处理 (简化版)
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement
    let imageKey = ''
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0]
        imageKey = `${Date.now()}-${file.name}`
        await api.upload(`/api/upload/${imageKey}`, file)
    }

    const data = {
      category_id: formData.get('category_id'),
      name: formData.get('name'),
      supplier: formData.get('supplier'),
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      image_key: imageKey
    }

    await api.post('/api/items', data)
    setShowAddItem(false)
    refreshData()
  }

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showTransaction) return
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    const data = {
      item_id: showTransaction.item.id,
      type: showTransaction.type,
      quantity: Number(formData.get('quantity')),
      date: formData.get('date'),
      department: formData.get('department'),
      user: formData.get('user'),
      note: formData.get('note')
    }

    await api.post('/api/transactions', data)
    setShowTransaction(null)
    refreshData()
  }

  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      const formData = new FormData(form)
      await api.post('/api/categories', {
          name: formData.get('name'),
          description: formData.get('description')
      })
      form.reset()
      refreshData()
  }

  // --- 渲染 ---

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">耗材管理系统</h1>
          <input className="w-full mb-4 p-2 border rounded" placeholder="用户名" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
          <input className="w-full mb-6 p-2 border rounded" type="password" placeholder="密码" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">登录</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="text-blue-600" /> IT耗材管理
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">当前用户: {user}</span>
          <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded"><LogOut size={20} /></button>
        </div>
      </header>

      {/* 主体 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button onClick={() => setActiveTab('inventory')} className={`pb-2 px-4 ${activeTab === 'inventory' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>库存列表</button>
          <button onClick={() => setActiveTab('categories')} className={`pb-2 px-4 ${activeTab === 'categories' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>分类管理</button>
          <button onClick={() => setActiveTab('history')} className={`pb-2 px-4 ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>出入库记录</button>
        </div>

        {/* Inventory View */}
        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input placeholder="搜索物品..." className="pl-10 pr-4 py-2 border rounded w-64" />
              </div>
              <button onClick={() => setShowAddItem(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                <Plus size={18} /> 新增物品
              </button>
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="p-4">图片</th>
                    <th className="p-4">分类</th>
                    <th className="p-4">品牌/型号</th>
                    <th className="p-4">供应商</th>
                    <th className="p-4">单价</th>
                    <th className="p-4">库存</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-4">
                          {item.image_key ? (
                              <img src={`/api/assets/${item.image_key}`} className="w-10 h-10 object-cover rounded bg-gray-100" />
                          ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400"><Package size={16}/></div>
                          )}
                      </td>
                      <td className="p-4 text-gray-600">{item.category_name}</td>
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-gray-500">{item.supplier}</td>
                      <td className="p-4">¥{item.price}</td>
                      <td className={`p-4 font-bold ${item.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>{item.stock}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => setShowTransaction({ type: 'IN', item })} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="入库"><Plus size={18} /></button>
                        <button onClick={() => setShowTransaction({ type: 'OUT', item })} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="出库"><Minus size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories View */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded shadow h-fit">
                <h3 className="font-bold mb-4">添加新分类</h3>
                <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                    <input name="name" placeholder="分类名称 (如: 打印耗材)" className="p-2 border rounded" required />
                    <textarea name="description" placeholder="描述" className="p-2 border rounded" rows={3} />
                    <button className="bg-green-600 text-white py-2 rounded hover:bg-green-700">保存</button>
                </form>
            </div>
            <div className="md:col-span-2 bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr><th className="p-4">ID</th><th className="p-4">名称</th><th className="p-4">描述</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {categories.map(c => (
                            <tr key={c.id}>
                                <td className="p-4 text-gray-500">#{c.id}</td>
                                <td className="p-4 font-medium">{c.name}</td>
                                <td className="p-4 text-gray-600">{c.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* History View */}
        {activeTab === 'history' && (
            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="p-4">时间</th>
                            <th className="p-4">类型</th>
                            <th className="p-4">物品</th>
                            <th className="p-4">数量</th>
                            <th className="p-4">部门/人员</th>
                            <th className="p-4">备注</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-500">{t.transaction_date}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${t.type === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {t.type === 'IN' ? '入库' : '出库'}
                                    </span>
                                </td>
                                <td className="p-4 font-medium">{t.item_name}</td>
                                <td className="p-4 font-bold">{t.quantity}</td>
                                <td className="p-4 text-gray-600">{t.department} - {t.user}</td>
                                <td className="p-4 text-gray-400 text-sm">{t.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </main>

      {/* Modals */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">新增物品</h2>
            <form onSubmit={handleAddItem} className="flex flex-col gap-3">
              <select name="category_id" className="p-2 border rounded" required>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input name="name" placeholder="品牌/型号" className="p-2 border rounded" required />
              <input name="supplier" placeholder="供应商" className="p-2 border rounded" />
              <input name="price" type="number" step="0.01" placeholder="单价" className="p-2 border rounded" />
              <input name="stock" type="number" placeholder="初始库存" className="p-2 border rounded" />
              <div className="border p-2 rounded">
                  <label className="text-xs text-gray-500 block mb-1">物品图片</label>
                  <input type="file" accept="image/*" className="text-sm" />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowAddItem(false)} className="flex-1 bg-gray-200 py-2 rounded">取消</button>
                <button className="flex-1 bg-blue-600 text-white py-2 rounded">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">{showTransaction.type === 'IN' ? '入库' : '出库'} - {showTransaction.item.name}</h2>
            <form onSubmit={handleTransaction} className="flex flex-col gap-3">
              <input name="quantity" type="number" min="1" placeholder="数量" className="p-2 border rounded" required autoFocus />
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="p-2 border rounded" required />
              <input name="department" placeholder="部门 (如: 财务部)" className="p-2 border rounded" required />
              <input name="user" placeholder="使用人/经手人" className="p-2 border rounded" required />
              <textarea name="note" placeholder="备注" className="p-2 border rounded" rows={2} />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowTransaction(null)} className="flex-1 bg-gray-200 py-2 rounded">取消</button>
                <button className="flex-1 bg-blue-600 text-white py-2 rounded">提交</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
