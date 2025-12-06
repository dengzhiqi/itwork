import re

# Read the file
with open('app/routes/staff._index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add DELETE statement for department deletion
content = content.replace(
    '''        if (staffCount[0].count > 0) {
            return json({
                error: `无法删除部门"${deptName}"，该部门还有 ${staffCount[0].count} 名人员`
            }, { status: 400 });
        }

        return json({ success: true, message: "部门已删除" });''',
    '''        if (staffCount[0].count > 0) {
            return json({
                error: `无法删除部门"${deptName}"，该部门还有 ${staffCount[0].count} 名人员`
            }, { status: 400 });
        }
        
        // Delete from departments table
        await env.DB.prepare(
            "DELETE FROM departments WHERE name = ?"
        ).bind(deptName).run();

        return json({ success: true, message: "部门已删除" });'''
)

# Fix 2: Update add department to use departments table
content = content.replace(
    '''        // Check if department already exists
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

        return json({ success: true, message: "部门已创建" });''',
    '''        // Check if department already exists
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

        return json({ success: true, message: "部门已创建" });'''
)

# Write back
with open('app/routes/staff._index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Department management fixed successfully!")
