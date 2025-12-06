# 修复部门管理 - 使用 departments 表

## 需要修改的文件
`app/routes/staff._index.tsx`

## 修改1: 更新 loader 函数（第16-24行）

**查找：**
```tsx
const { results: departments } = await env.DB.prepare(`
    SELECT 
        department,
        COUNT(*) as staff_count
    FROM staff 
    WHERE department IS NOT NULL AND department != ''
    GROUP BY department
    ORDER BY department ASC
`).all();
```

**替换为：**
```tsx
const { results: departments } = await env.DB.prepare(`
    SELECT 
        d.name as department,
        COUNT(s.id) as staff_count
    FROM departments d
    LEFT JOIN staff s ON d.name = s.department
    GROUP BY d.id, d.name
    ORDER BY d.name ASC
`).all();
```

## 修改2: 更新 addDept action（第85-97行）

**查找：**
```tsx
const { results: existing } = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM staff WHERE department = ?"
).bind(deptName).all();

if (existing[0].count > 0) {
    return json({ error: "该部门已存在" }, { status: 400 });
}

// Create a placeholder staff entry to establish the department
// This is a workaround since departments are derived from staff table
await env.DB.prepare(
    "INSERT INTO staff (department, name) VALUES (?, ?)"
).bind(deptName, "[占位]").run();
```

**替换为：**
```tsx
const { results: existing } = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM departments WHERE name = ?"
).bind(deptName).all();

if (existing[0].count > 0) {
    return json({ error: "该部门已存在" }, { status: 400 });
}

// Insert into departments table
await env.DB.prepare(
    "INSERT INTO departments (name) VALUES (?)"
).bind(deptName).run();
```

## 完成后
1. 保存文件
2. 运行 `npm run build`
3. 部署到 Cloudflare Pages

现在添加部门不会再创建占位人员了！
