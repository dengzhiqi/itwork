import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
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

    return json({ categories, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "add") {
        const name = formData.get("name") as string;

        if (!name) return json({ error: "分类名称不能为空" }, { status: 400 });

        try {
            // Check if category name already exists (case-insensitive)
            const { results: allCategories } = await env.DB.prepare(
                "SELECT name, slug FROM categories"
            ).all();

            const nameExists = (allCategories as any[]).some(
                cat => cat.name.toLowerCase() === name.toLowerCase()
            );

            if (nameExists) {
                return json({ error: "该分类名称已存在，请使用其他名称" }, { status: 400 });
            }

            // Generate slug from name (handle Chinese characters)
            let slug = name.toLowerCase()
                .replace(/[\u4e00-\u9fa5]/g, '') // Remove Chinese characters
                .replace(/\s+/g, '-')
                .replace(/[^\w-]/g, '');

            // If slug is empty (all Chinese), use timestamp-based slug
            if (!slug) {
                slug = `category-${Date.now()}`;
            }

            // Check if slug already exists, if so, append counter
            const existingSlugs = (allCategories as any[]).map(cat => cat.slug);
            let finalSlug = slug;
            let counter = 1;

            while (existingSlugs.includes(finalSlug)) {
                finalSlug = `${slug}-${counter}`;
                counter++;
            }

            await env.DB.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)")
                .bind(name, finalSlug).run();
            return redirect("/categories");
        } catch (e: any) {
            console.error("Error adding category:", e);
            return json({ error: `添加分类失败: ${e.message || '未知错误'}` }, { status: 400 });
        }
    }

    if (intent === "delete") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    return null;
}

export default function Categories() {
    const { categories, user } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isAdding = navigation.formData?.get("intent") === "add";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <img src="/icons/categories.svg" alt="" style={{ width: "32px", height: "32px" }} />
                        <h2 style={{ margin: 0 }}>分类管理</h2>
                    </div>
                </div>

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
                                value="add"
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
                                            value="delete"
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
        </Layout>
    );
}
