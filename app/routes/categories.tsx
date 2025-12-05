import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    const { results: categories } = await env.DB.prepare("SELECT * FROM categories ORDER BY name ASC").all();
    return json({ categories, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "add") {
        const name = formData.get("name") as string;
        let slug = name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, "");

        if (!name) return json({ error: "Name required" }, { status: 400 });

        try {
            // Check if slug already exists
            const { results: existing } = await env.DB.prepare("SELECT id FROM categories WHERE slug = ?").bind(slug).all();

            // If slug exists, append a number to make it unique
            if (existing && existing.length > 0) {
                let counter = 1;
                let newSlug = `${slug}-${counter}`;
                while (true) {
                    const { results: check } = await env.DB.prepare("SELECT id FROM categories WHERE slug = ?").bind(newSlug).all();
                    if (!check || check.length === 0) {
                        slug = newSlug;
                        break;
                    }
                    counter++;
                    newSlug = `${slug}-${counter}`;
                }
            }

            await env.DB.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)").bind(name, slug).run();
            return json({ success: true });
        } catch (e) {
            return json({ error: "添加分类失败" }, { status: 400 });
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
    const navigation = useNavigation();
    const isAdding = navigation.formData?.get("intent") === "add";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>分类管理</h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
                    {/* Add Category Form */}
                    <div className="glass-card" style={{ padding: "1.5rem", height: "fit-content" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>添加新分类</h3>
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
                                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{cat.slug}</p>
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
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
