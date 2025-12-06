import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useSearchParams, useActionData } from "@remix-run/react";
import { useState } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get categories with product count
    const { results: categories } = await env.DB.prepare(`
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id
        ORDER BY c.name ASC
    `).all();

    // Get suppliers
    const { results: suppliers } = await env.DB.prepare("SELECT * FROM suppliers ORDER BY company_name ASC").all();

    return json({ categories, suppliers, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

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

        return redirect("/settings?tab=suppliers");
    }

    if (intent === "delete_supplier") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM suppliers WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    return json({ success: false });
}

export default function Settings() {
    const { categories, suppliers, user } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "categories";
    const isAdding = navigation.formData?.get("intent")?.toString().startsWith("add");

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                <div>
                    <h2 style={{ marginBottom: "0.5rem" }}>系统设置</h2>
                    <p style={{ color: "var(--text-secondary)" }}>管理分类、供应商等系统配置</p>
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
                            cursor: "pointer",
                            marginBottom: "-2px"
                        }}
                    >
                        分类管理
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
                            cursor: "pointer",
                            marginBottom: "-2px"
                        }}
                    >
                        供应商管理
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

                                <Form method="post">
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label>分类名称</label>
                                        <input type="text" name="name" placeholder="例如: 办公椅" required />
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

                {/* Suppliers Tab */}
                {activeTab === "suppliers" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
                            {/* Add Supplier Form */}
                            <div className="glass-card" style={{ padding: "1.5rem", height: "fit-content" }}>
                                <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>添加新供应商</h3>
                                <Form method="post" style={{ display: "grid", gap: "1rem" }}>
                                    <div>
                                        <label>公司名称</label>
                                        <input type="text" name="company_name" required />
                                    </div>
                                    <div>
                                        <label>联系人</label>
                                        <input type="text" name="contact_person" />
                                    </div>
                                    <div>
                                        <label>电话</label>
                                        <input type="tel" name="phone" />
                                    </div>
                                    <div>
                                        <label>邮箱</label>
                                        <input type="email" name="email" />
                                    </div>
                                    <button
                                        type="submit"
                                        name="intent"
                                        value="add_supplier"
                                        className="btn btn-primary"
                                        disabled={isAdding}
                                    >
                                        {isAdding ? "添加中..." : "添加供应商"}
                                    </button>
                                </Form>
                            </div>

                            {/* Suppliers List */}
                            <div>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                                            <th style={{ padding: "1rem", textAlign: "left" }}>公司名称</th>
                                            <th style={{ padding: "1rem", textAlign: "left" }}>联系人</th>
                                            <th style={{ padding: "1rem", textAlign: "left" }}>电话</th>
                                            <th style={{ padding: "1rem", textAlign: "left" }}>邮箱</th>
                                            <th style={{ padding: "1rem", textAlign: "right" }}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suppliers.map((s: any) => (
                                            <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                                <td style={{ padding: "1rem", fontWeight: 600 }}>{s.company_name}</td>
                                                <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{s.contact_person || "-"}</td>
                                                <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{s.phone || "-"}</td>
                                                <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{s.email || "-"}</td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>
                                                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                                        <a href={`/suppliers/${s.id}/edit`} style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>
                                                            编辑
                                                        </a>
                                                        <Form method="post" style={{ display: "inline" }}>
                                                            <input type="hidden" name="id" value={s.id} />
                                                            <button
                                                                type="submit"
                                                                name="intent"
                                                                value="delete_supplier"
                                                                style={{ background: "none", border: "none", color: "var(--danger-color)", fontSize: "0.875rem", cursor: "pointer" }}
                                                                onClick={(e) => !confirm("确定要删除这个供应商吗？") && e.preventDefault()}
                                                            >
                                                                删除
                                                            </button>
                                                        </Form>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {suppliers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                                    暂无供应商。使用左侧表单添加。
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logout Button */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>账户</h3>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ color: "var(--text-primary)", marginBottom: "0.25rem" }}>当前用户</p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{user}</p>
                        </div>
                        <form action="/logout" method="post">
                            <button
                                type="submit"
                                className="btn"
                                style={{
                                    background: "none",
                                    border: "1px solid var(--danger-color)",
                                    color: "var(--danger-color)",
                                    padding: "0.5rem 1.5rem"
                                }}
                            >
                                退出登录
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
