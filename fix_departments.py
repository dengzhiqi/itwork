import re

# Read the file
with open('app/routes/staff._index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1: Update loader query
old_query = """    // Get departments with staff count
    const { results: departments } = await env.DB.prepare(`
        SELECT 
            department,
            COUNT(*) as staff_count
        FROM staff 
        WHERE department IS NOT NULL AND department != ''
        GROUP BY department
        ORDER BY department ASC
    `).all();"""

new_query = """    // Get departments with staff count
    const { results: departments } = await env.DB.prepare(`
        SELECT 
            d.name as department,
            COUNT(s.id) as staff_count
        FROM departments d
        LEFT JOIN staff s ON d.name = s.department
        GROUP BY d.id, d.name
        ORDER BY department ASC
    `).all();"""

content = content.replace(old_query, new_query)

# Replace 2: Update addDept action
old_add = """        // Check if department already exists
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
        ).bind(deptName, "[占位]").run();"""

new_add = """        // Check if department already exists
        const { results: existing } = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM departments WHERE name = ?"
        ).bind(deptName).all();
        
        if (existing[0].count > 0) {
            return json({ error: "该部门已存在" }, { status: 400 });
        }
        
        // Insert into departments table
        await env.DB.prepare(
            "INSERT INTO departments (name) VALUES (?)"
        ).bind(deptName).run();"""

content = content.replace(old_add, new_add)

# Write back
with open('app/routes/staff._index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
