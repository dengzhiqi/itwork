import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useNavigation, useSearchParams, useActionData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

import { useTheme } from "../contexts/ThemeContext";
import { themes } from "../utils/themes";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get categories with product count
    let categories: any[] = [];
    try {
        const { results } = await env.DB.prepare(`
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `).all();
        categories = results || [];
    } catch (e) {
        console.error("Failed to load categories:", e);
    }

    // Get all staff
    let staff: any[] = [];
    try {
        const { results } = await env.DB.prepare("SELECT * FROM staff ORDER BY department, name ASC").all();
        staff = results || [];
    } catch (e) {
        console.error("Failed to load staff:", e);
    }

    // Get departments with staff count
    let departments: any[] = [];
    try {
        const { results } = await env.DB.prepare(`
            SELECT 
                d.name as department,
                COUNT(s.id) as staff_count
            FROM departments d
            LEFT JOIN staff s ON d.name = s.department
            GROUP BY d.id, d.name
            ORDER BY department ASC
        `).all();
        departments = results || [];
    } catch (e) {
        console.error("Failed to load departments:", e);
    }

    // Get suppliers
    let suppliers: any[] = [];
    try {
        const { results } = await env.DB.prepare("SELECT * FROM suppliers ORDER BY company_name ASC").all();
        suppliers = results || [];
    } catch (e) {
        console.error("Failed to load suppliers:", e);
    }

    return json({ categories, staff, departments, suppliers, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

    // Staff actions
    if (intent === "delete_staff") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM staff WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    // Department actions
    if (intent === "rename_dept") {
        const oldName = formData.get("oldName");
        const newName = formData.get("newName");

        // Update departments table (source of truth for department names)
        await env.DB.prepare(
            "UPDATE departments SET name = ? WHERE name = ?"
        ).bind(newName, oldName).run();

        // Update references in staff table
        await env.DB.prepare(
            "UPDATE staff SET department = ? WHERE department = ?"
        ).bind(newName, oldName).run();

        // Update references in transactions table
        await env.DB.prepare(
            "UPDATE transactions SET department = ? WHERE department = ?"
        ).bind(newName, oldName).run();

        return json({ success: true, message: "部门已重命名" });
    }

    if (intent === "delete_dept") {
        const deptName = formData.get("deptName");

        const { results: staffCount } = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM staff WHERE department = ?"
        ).bind(deptName).all();

        if (staffCount[0].count > 0) {
            return json({
                error: `无法删除部门"${deptName}"，该部门还有 ${staffCount[0].count} 名人员`
            }, { status: 400 });
        }

        // Delete from departments table
        await env.DB.prepare(
            "DELETE FROM departments WHERE name = ?"
        ).bind(deptName).run();

        return json({ success: true, message: "部门已删除" });
    }

    if (intent === "add_dept") {
        const deptName = formData.get("deptName");

        if (!deptName) {
            return json({ error: "部门名称不能为空" }, { status: 400 });
        }

        // Check if department already exists
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

        return json({ success: true, message: "部门已创建", resetForm: true });
    }

    // Category actions
    if (intent === "add_category") {
        const name = formData.get("name") as string;

        if (!name) return json({ error: "分类名称不能为空" }, { status: 400 });

        try {
            const { results: allCategories } = await env.DB.prepare(
                "SELECT name, slug FROM categories"
            ).all();

            const nameExists = (allCategories as any[]).some(
                cat => cat.name.toLowerCase() === name.toLowerCase()
            );

            if (nameExists) {
                return json({ error: "该分类名称已存在，请使用其他名称" }, { status: 400 });
            }

            let slug = name.toLowerCase()
                .replace(/[\u4e00-\u9fa5]/g, '')
                .replace(/\s+/g, '-')
                .replace(/[^\w-]/g, '');

            if (!slug) {
                slug = `category-${Date.now()}`;
            }

            const existingSlugs = (allCategories as any[]).map(cat => cat.slug);
            let finalSlug = slug;
            let counter = 1;

            while (existingSlugs.includes(finalSlug)) {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }

            await env.DB.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)")
                .bind(name, finalSlug).run();
            return redirect("/settings?tab=categories");
        } catch (e: any) {
            return json({ error: `添加分类失败: ${e.message || '未知错误'}` }, { status: 400 });
        }
    }

    if (intent === "delete_category") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    // Supplier actions
    if (intent === "add_supplier") {
        const company_name = formData.get("company_name");
        const contact_person = formData.get("contact_person");
        const phone = formData.get("phone");
        const email = formData.get("email");

        if (!company_name) {
            return json({ error: "公司名称不能为空" }, { status: 400 });
        }

        await env.DB.prepare(
            "INSERT INTO suppliers (company_name, contact_person, phone, email) VALUES (?, ?, ?, ?)"
        ).bind(company_name, contact_person, phone, email).run();

        return json({ success: true, message: "供应商已添加", resetForm: true });
    }

    if (intent === "edit_supplier") {
        const id = formData.get("id");
        const company_name = formData.get("company_name");
        const contact_person = formData.get("contact_person");
        const phone = formData.get("phone");
        const email = formData.get("email");

        if (!company_name) {
            return json({ error: "公司名称不能为空" }, { status: 400 });
        }

        await env.DB.prepare(
            "UPDATE suppliers SET company_name = ?, contact_person = ?, phone = ?, email = ? WHERE id = ?"
        ).bind(company_name, contact_person, phone, email, id).run();

        return json({ success: true, message: "供应商已更新" });
    }

    if (intent === "delete_supplier") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM suppliers WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    return json({ success: false });
}

export default function Settings() {
    const { categories, staff, departments, suppliers, user } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const fetcher = useFetcher();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "categories";
    const isAdding = navigation.formData?.get("intent")?.toString().startsWith("add");

    const [isAddingSupplier, setIsAddingSupplier] = useState(false);

    // Staff and Department state
    const [editingDept, setEditingDept] = useState<string | null>(null);
    const [newDeptName, setNewDeptName] = useState("");
    const [addingDept, setAddingDept] = useState(false);
    const [newDept, setNewDept] = useState("");

    // Supplier editing state
    const [editingSupplier, setEditingSupplier] = useState<number | null>(null);
    const [editSupplierData, setEditSupplierData] = useState({ company_name: "", contact_person: "", phone: "", email: "" });

    // Theme-related state
    const { currentTheme, setTheme } = useTheme();

    useEffect(() => {
        if (actionData?.success && actionData?.resetForm && isAddingSupplier) {
            // Reset supplier form but keep it open
            const form = document.querySelector('form[method="post"] input[name="company_name"]') as HTMLInputElement;
            if (form) {
                form.closest('form')?.reset();
                form.focus();
            }
        }
        if (actionData?.success && actionData?.resetForm && addingDept) {
            // Reset department form but keep it open
            setNewDept("");
        }
    }, [actionData, isAddingSupplier, addingDept]);

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <img className="theme-icon" src="/icons/settings.svg" alt="" style={{ width: "32px", height: "32px" }} />
                    <div>
                        <h2 style={{ margin: 0 }}>设置</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>管理分类、供应商等系统配置</p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid var(--border-light)" }}>
                    <button
                        onClick={() => setSearchParams({ tab: "categories" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "categories" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "categories" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "categories" ? "bold" : "normal",
                            fontSize: "1.125rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <img className="theme-icon" src="/icons/category-tab.svg" alt="" style={{ width: "16px", height: "16px", opacity: activeTab === "categories" ? 1 : 0.6 }} />
                        分类管理
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: "staff" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "staff" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "staff" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "staff" ? "bold" : "normal",
                            fontSize: "1.125rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <img className="theme-icon" src="/icons/staff-tab.svg" alt="" style={{ width: "16px", height: "16px", opacity: activeTab === "staff" ? 1 : 0.6 }} />
                        人员管理
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: "departments" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "departments" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "departments" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "departments" ? "bold" : "normal",
                            fontSize: "1.125rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <img className="theme-icon" src="/icons/department-tab.svg" alt="" style={{ width: "16px", height: "16px", opacity: activeTab === "departments" ? 1 : 0.6 }} />
                        部门管理
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: "suppliers" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "suppliers" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "suppliers" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "suppliers" ? "bold" : "normal",
                            fontSize: "1.125rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <img className="theme-icon" src="/icons/supplier-tab.svg" alt="" style={{ width: "16px", height: "16px", opacity: activeTab === "suppliers" ? 1 : 0.6 }} />
                        供应商管理
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: "system" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "system" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "system" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "system" ? "bold" : "normal",
                            fontSize: "1.125rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <img className="theme-icon" src="/icons/theme-tab.svg" alt="" style={{ width: "16px", height: "16px", opacity: activeTab === "system" ? 1 : 0.6 }} />
                        主题
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: "data" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "data" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "data" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "data" ? "bold" : "normal",
                            fontSize: "1.125rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem"
                        }}
                    >
                        <img className="theme-icon" src="/icons/data-tab.svg" alt="" style={{ width: "16px", height: "16px", opacity: activeTab === "data" ? 1 : 0.6 }} />
                        数据管理
                    </button>
                </div>

                {/* Categories Tab */}
                {activeTab === "categories" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
                            {/* Add Category Form */}
                            <div className="glass-card" style={{ padding: "1.5rem", height: "fit-content" }}>
                                <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>添加新分类</h3>

                                {actionData?.error && (
                                    <div style={{
                                        padding: "0.75rem",
                                        marginBottom: "1rem",
                                        background: "rgba(239, 68, 68, 0.1)",
                                        border: "1px solid rgba(239, 68, 68, 0.3)",
                                        borderRadius: "var(--radius-sm)",
                                        color: "#fca5a5",
                                        fontSize: "0.875rem"
                                    }}>
                                        {actionData.error}
                                    </div>
                                )}

                                <div style={{
                                    padding: "0.75rem",
                                    marginBottom: "1rem",
                                    background: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.875rem",
                                    color: "var(--text-secondary)",
                                    lineHeight: "1.5"
                                }}>
                                    如需删除某项分类，请先在库存管理中，删除该类目录下所有商品。
                                </div>

                                <Form method="post">
                                    <div style={{ marginBottom: "1rem" }}>
                                        <input type="text" name="name" placeholder="例如: 移动硬盘" required />
                                    </div>
                                    <button
                                        type="submit"
                                        name="intent"
                                        value="add_category"
                                        className="btn btn-primary"
                                        style={{ width: "100%" }}
                                        disabled={isAdding}
                                    >
                                        {isAdding ? "添加中..." : "添加分类"}
                                    </button>
                                </Form>
                            </div>

                            {/* List */}
                            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                                {categories.map((cat: any) => (
                                    <div key={cat.id} className="glass-card" style={{ padding: "1rem", position: "relative" }}>
                                        <h4 style={{ color: "var(--text-primary)", marginBottom: "0.25rem" }}>{cat.name}</h4>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                            {cat.product_count} 个商品
                                        </p>
                                        {cat.product_count === 0 && (
                                            <Form method="post" style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}>
                                                <input type="hidden" name="id" value={cat.id} />
                                                <button
                                                    type="submit"
                                                    name="intent"
                                                    value="delete_category"
                                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", opacity: 0.5 }}
                                                    title="删除"
                                                    onClick={(e) => !confirm("确定要删除吗?") && e.preventDefault()}
                                                >
                                                    ✕
                                                </button>
                                            </Form>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Tab */}
                {activeTab === "staff" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h3 style={{ margin: 0 }}>人员列表</h3>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <Link to="/staff/import" className="btn" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-light)", padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                                    导入 CSV
                                </Link>
                                <Link to="/staff/new" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                                    + 添加人员
                                </Link>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                        <th style={{ padding: "1rem" }}>部门</th>
                                        <th style={{ padding: "1rem" }}>姓名</th>
                                        <th style={{ padding: "1rem" }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map((s: any, index: number) => {
                                        // Check if this is the first person in this department
                                        const isFirstInDept = index === 0 || staff[index - 1].department !== s.department;

                                        return (
                                            <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                                <td style={{ padding: "1rem" }}>
                                                    {isFirstInDept ? s.department : ""}
                                                </td>
                                                <td style={{ padding: "1rem", fontWeight: 600 }}>{s.name}</td>
                                                <td style={{ padding: "1rem" }}>
                                                    <div style={{ display: "flex", gap: "1rem" }}>
                                                        <Link to={`/staff/${s.id}/edit`} style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>
                                                            编辑
                                                        </Link>
                                                        <Form method="post" onSubmit={(e) => !confirm("确定要删除这个人员吗？") && e.preventDefault()}>
                                                            <input type="hidden" name="intent" value="delete_staff" />
                                                            <input type="hidden" name="id" value={s.id} />
                                                            <button type="submit" style={{ background: "none", border: "none", color: "var(--danger-color)", fontSize: "0.875rem", cursor: "pointer" }}>
                                                                删除
                                                            </button>
                                                        </Form>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {staff.length === 0 && (
                                        <tr>
                                            <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                                暂无人员。点击上方按钮添加。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Departments Tab */}
                {activeTab === "departments" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h3 style={{ margin: 0 }}>部门列表</h3>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                {/* Placeholder to match staff tab layout */}
                                <div style={{ width: "88px" }}></div>
                                {!addingDept && (
                                    <button
                                        onClick={() => setAddingDept(true)}
                                        className="btn btn-primary"
                                        style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                                    >
                                        + 添加部门
                                    </button>
                                )}
                            </div>
                        </div>

                        {addingDept && (
                            <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                                <Form method="post" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                    <input type="hidden" name="intent" value="add_dept" />
                                    <input
                                        type="text"
                                        name="deptName"
                                        value={newDept}
                                        onChange={(e) => setNewDept(e.target.value)}
                                        placeholder="输入新部门名称"
                                        style={{ flex: 1 }}
                                        autoFocus
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                                        disabled={!newDept.trim()}
                                    >
                                        确认
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewDept("");
                                            setAddingDept(false);
                                        }}
                                        className="btn btn-secondary"
                                        style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                                    >
                                        取消
                                    </button>
                                </Form>
                            </div>
                        )}

                        {actionData?.error && (
                            <div style={{
                                padding: "0.75rem",
                                marginBottom: "1rem",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "var(--radius-sm)",
                                color: "#fca5a5",
                                fontSize: "0.875rem"
                            }}>
                                {actionData.error}
                            </div>
                        )}

                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                                    <th style={{ padding: "1rem", textAlign: "left" }}>部门名称</th>
                                    <th style={{ padding: "1rem", textAlign: "center" }}>人员数量</th>
                                    <th style={{ padding: "1rem", textAlign: "right" }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                            暂无部门。添加人员时会自动创建部门。
                                        </td>
                                    </tr>
                                ) : (
                                    departments.map((dept: any) => (
                                        <tr key={dept.department} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <td style={{ padding: "1rem" }}>
                                                {editingDept === dept.department ? (
                                                    <input
                                                        type="text"
                                                        value={newDeptName}
                                                        onChange={(e) => setNewDeptName(e.target.value)}
                                                        style={{ width: "100%", maxWidth: "300px" }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <strong>{dept.department}</strong>
                                                )}
                                            </td>
                                            <td style={{ padding: "1rem", textAlign: "center" }}>
                                                <span style={{
                                                    background: "var(--bg-secondary)",
                                                    padding: "0.25rem 0.75rem",
                                                    borderRadius: "var(--radius-sm)",
                                                    fontWeight: "bold"
                                                }}>
                                                    {dept.staff_count} 人
                                                </span>
                                            </td>
                                            <td style={{ padding: "1rem", textAlign: "right" }}>
                                                {editingDept === dept.department ? (
                                                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                        <Form method="post" style={{ display: "inline" }}>
                                                            <input type="hidden" name="intent" value="rename_dept" />
                                                            <input type="hidden" name="oldName" value={dept.department} />
                                                            <input type="hidden" name="newName" value={newDeptName} />
                                                            <button
                                                                type="submit"
                                                                className="btn btn-primary"
                                                                style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                                disabled={!newDeptName || newDeptName === dept.department}
                                                            >
                                                                保存
                                                            </button>
                                                        </Form>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDept(null);
                                                                setNewDeptName("");
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDept(dept.department);
                                                                setNewDeptName(dept.department);
                                                            }}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                fontSize: "0.875rem",
                                                                color: "var(--text-accent)",
                                                                cursor: "pointer",
                                                                padding: 0
                                                            }}
                                                        >
                                                            编辑
                                                        </button>
                                                        <Form method="post" style={{ display: "inline" }}>
                                                            <input type="hidden" name="intent" value="delete_dept" />
                                                            <input type="hidden" name="deptName" value={dept.department} />
                                                            <button
                                                                type="submit"
                                                                style={{
                                                                    background: "none",
                                                                    border: "none",
                                                                    padding: 0,
                                                                    fontSize: "0.875rem",
                                                                    color: dept.staff_count > 0 ? "var(--text-secondary)" : "var(--danger-color)",
                                                                    cursor: dept.staff_count > 0 ? "not-allowed" : "pointer",
                                                                    opacity: dept.staff_count > 0 ? 0.5 : 1
                                                                }}
                                                                disabled={dept.staff_count > 0}
                                                                onClick={(e) => {
                                                                    if (!confirm(`确定要删除部门"${dept.department}"吗？`)) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            >
                                                                删除
                                                            </button>
                                                        </Form>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Suppliers Tab */}
                {activeTab === "suppliers" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h3 style={{ margin: 0 }}>供应商列表</h3>
                            {!isAddingSupplier && (
                                <button
                                    onClick={() => setIsAddingSupplier(true)}
                                    className="btn btn-primary"
                                >
                                    + 添加供应商
                                </button>
                            )}
                        </div>

                        {isAddingSupplier && (
                            <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                                <Form method="post" style={{ display: "grid", gap: "1rem" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                                        <div>
                                            <label>公司名称 *</label>
                                            <input type="text" name="company_name" required placeholder="输入公司名称" autoFocus />
                                        </div>
                                        <div>
                                            <label>联系人</label>
                                            <input type="text" name="contact_person" placeholder="输入联系人" />
                                        </div>
                                        <div>
                                            <label>电话</label>
                                            <input type="tel" name="phone" placeholder="输入电话号码" />
                                        </div>
                                        <div>
                                            <label>邮箱</label>
                                            <input type="email" name="email" placeholder="输入邮箱地址" />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingSupplier(false)}
                                            className="btn btn-secondary"
                                            style={{ padding: "0.5rem 1.5rem" }}
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            name="intent"
                                            value="add_supplier"
                                            className="btn btn-primary"
                                            style={{ padding: "0.5rem 1.5rem" }}
                                            disabled={isAdding}
                                        >
                                            {isAdding ? "保存中..." : "保存"}
                                        </button>
                                    </div>
                                </Form>
                            </div>
                        )}

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid var(--border-light)", textAlign: "left" }}>
                                        <th style={{ padding: "1rem" }}>公司名称</th>
                                        <th style={{ padding: "1rem" }}>联系人</th>
                                        <th style={{ padding: "1rem" }}>电话</th>
                                        <th style={{ padding: "1rem" }}>邮箱</th>
                                        <th style={{ padding: "1rem", textAlign: "right" }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map((s: any) => (
                                        <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <td style={{ padding: "1rem" }}>
                                                {editingSupplier === s.id ? (
                                                    <input
                                                        type="text"
                                                        value={editSupplierData.company_name}
                                                        onChange={(e) => setEditSupplierData({ ...editSupplierData, company_name: e.target.value })}
                                                        style={{ width: "100%" }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <strong>{s.company_name}</strong>
                                                )}
                                            </td>
                                            <td style={{ padding: "1rem" }}>
                                                {editingSupplier === s.id ? (
                                                    <input
                                                        type="text"
                                                        value={editSupplierData.contact_person}
                                                        onChange={(e) => setEditSupplierData({ ...editSupplierData, contact_person: e.target.value })}
                                                        style={{ width: "100%" }}
                                                    />
                                                ) : (
                                                    s.contact_person || "-"
                                                )}
                                            </td>
                                            <td style={{ padding: "1rem" }}>
                                                {editingSupplier === s.id ? (
                                                    <input
                                                        type="tel"
                                                        value={editSupplierData.phone}
                                                        onChange={(e) => setEditSupplierData({ ...editSupplierData, phone: e.target.value })}
                                                        style={{ width: "100%" }}
                                                    />
                                                ) : (
                                                    s.phone || "-"
                                                )}
                                            </td>
                                            <td style={{ padding: "1rem" }}>
                                                {editingSupplier === s.id ? (
                                                    <input
                                                        type="email"
                                                        value={editSupplierData.email}
                                                        onChange={(e) => setEditSupplierData({ ...editSupplierData, email: e.target.value })}
                                                        style={{ width: "100%" }}
                                                    />
                                                ) : (
                                                    s.email || "-"
                                                )}
                                            </td>
                                            <td style={{ padding: "1rem" }}>
                                                {editingSupplier === s.id ? (
                                                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                        <Form method="post" style={{ display: "inline" }}>
                                                            <input type="hidden" name="intent" value="edit_supplier" />
                                                            <input type="hidden" name="id" value={s.id} />
                                                            <input type="hidden" name="company_name" value={editSupplierData.company_name} />
                                                            <input type="hidden" name="contact_person" value={editSupplierData.contact_person} />
                                                            <input type="hidden" name="phone" value={editSupplierData.phone} />
                                                            <input type="hidden" name="email" value={editSupplierData.email} />
                                                            <button
                                                                type="submit"
                                                                className="btn btn-primary"
                                                                style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}
                                                                disabled={!editSupplierData.company_name}
                                                            >
                                                                保存
                                                            </button>
                                                        </Form>
                                                        <button
                                                            onClick={() => {
                                                                setEditingSupplier(null);
                                                                setEditSupplierData({ company_name: "", contact_person: "", phone: "", email: "" });
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingSupplier(s.id);
                                                                setEditSupplierData({
                                                                    company_name: s.company_name,
                                                                    contact_person: s.contact_person || "",
                                                                    phone: s.phone || "",
                                                                    email: s.email || ""
                                                                });
                                                            }}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                fontSize: "0.875rem",
                                                                color: "var(--text-accent)",
                                                                cursor: "pointer",
                                                                padding: 0,
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            编辑
                                                        </button>
                                                        <Form method="post" style={{ display: "inline" }}>
                                                            <input type="hidden" name="id" value={s.id} />
                                                            <button
                                                                type="submit"
                                                                name="intent"
                                                                value="delete_supplier"
                                                                style={{ background: "none", border: "none", color: "var(--danger-color)", fontSize: "0.875rem", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                                                                onClick={(e) => !confirm("确定要删除这个供应商吗？") && e.preventDefault()}
                                                            >
                                                                删除
                                                            </button>
                                                        </Form>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {suppliers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                                暂无供应商。点击上方按钮添加。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* System Tab */}
                {activeTab === "system" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>主题配色</h3>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                            选择您喜欢的配色方案，更改会立即生效
                        </p>

                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: "1rem"
                        }}>
                            {Object.values(themes).map((theme) => {
                                const isActive = currentTheme === theme.name;
                                return (
                                    <button
                                        key={theme.name}
                                        onClick={() => setTheme(theme.name)}
                                        style={{
                                            position: "relative",
                                            padding: "1.5rem",
                                            background: theme.colors.bgPanel,
                                            border: isActive
                                                ? `2px solid ${theme.colors.textAccent}`
                                                : "2px solid transparent",
                                            borderRadius: "var(--radius-md)",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            textAlign: "left",
                                            boxShadow: isActive
                                                ? `0 0 20px ${theme.colors.textAccent}40`
                                                : "none",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.transform = "translateY(-4px)";
                                                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }
                                        }}
                                    >
                                        {isActive && (
                                            <div style={{
                                                position: "absolute",
                                                top: "0.75rem",
                                                right: "0.75rem",
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                                background: theme.colors.primaryGradient,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "white",
                                                fontSize: "0.75rem",
                                                fontWeight: "bold",
                                            }}>
                                                ✓
                                            </div>
                                        )}

                                        <div style={{ marginBottom: "1rem" }}>
                                            <h4 style={{
                                                fontSize: "1rem",
                                                fontWeight: "600",
                                                color: theme.colors.textPrimary,
                                                marginBottom: "0.25rem"
                                            }}>
                                                {theme.displayName}
                                            </h4>
                                        </div>

                                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "var(--radius-sm)",
                                                background: theme.colors.primaryGradient,
                                            }} />
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "var(--radius-sm)",
                                                background: theme.colors.bgApp,
                                                border: `1px solid ${theme.colors.borderLight}`,
                                            }} />
                                        </div>

                                        <div style={{
                                            fontSize: "0.75rem",
                                            color: theme.colors.textSecondary,
                                        }}>
                                            {theme.name === 'ocean-blue' && '经典蓝色主题'}
                                            {theme.name === 'warm-sunset' && '温暖琥珀夜色'}
                                            {theme.name === 'sakura-pink' && '柔美樱花漫舞'}
                                            {theme.name === 'purple-dream' && '优雅丝绒之夜'}
                                            {theme.name === 'warm-ivory' && '清新米白日光'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Data Management Tab */}
                {activeTab === "data" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>数据导入</h3>

                        <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                            {/* OUT Transaction Import */}
                            <div className="glass-card" style={{ padding: "1.5rem" }}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <h4 style={{ fontSize: "1.125rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>📤 出库记录导入</h4>
                                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                                        批量导入历史出库记录，支持指定部门和经手人信息。
                                    </p>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    <Link
                                        to="/transactions/import?type=OUT"
                                        className="btn btn-primary"
                                        style={{ textAlign: "center", width: "100%" }}
                                    >
                                        导入出库记录
                                    </Link>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                                        支持 CSV 格式，需包含：日期、分类、品牌、型号、数量、部门、经手人
                                    </p>
                                </div>
                            </div>

                            {/* IN Transaction Import */}
                            <div className="glass-card" style={{ padding: "1.5rem" }}>
                                <div style={{ marginBottom: "1rem" }}>
                                    <h4 style={{ fontSize: "1.125rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>📥 入库记录导入</h4>
                                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                                        批量导入历史入库记录，支持指定单价和供应商信息。
                                    </p>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    <Link
                                        to="/transactions/import?type=IN"
                                        className="btn btn-primary"
                                        style={{ textAlign: "center", width: "100%" }}
                                    >
                                        导入入库记录
                                    </Link>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                                        支持 CSV 格式，需包含：日期、分类、品牌、型号、数量、单价、供应商
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            marginTop: "2rem",
                            padding: "1rem",
                            background: "var(--bg-secondary)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-light)"
                        }}>
                            <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>💡 导入说明</h4>
                            <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                                <li>CSV 文件必须使用 <strong>UTF-8 编码</strong></li>
                                <li>系统会根据品牌和型号自动匹配产品</li>
                                <li>如果产品不存在，可以选择自动创建</li>
                                <li>日期格式支持: YYYY-MM-DD 或 YYYY/MM/DD</li>
                                <li>导入前可下载模板文件查看格式要求</li>
                            </ul>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
