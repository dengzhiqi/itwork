import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { results: categories } = await env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
    return json({ categories, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const category_id = formData.get("category_id");
    const brand = formData.get("brand");
    const model = formData.get("model");
    const price = parseFloat(formData.get("price") as string) || 0;
    const supplier = formData.get("supplier");
    const stock_quantity = parseInt(formData.get("stock_quantity") as string) || 0;

    if (!category_id || !model) {
        return json({ error: "Category and Model are required" }, { status: 400 });
    }

    await env.DB.prepare(
        "INSERT INTO products (category_id, brand, model, supplier, price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(category_id, brand, model, supplier, price, stock_quantity).run();

    return redirect("/inventory");
}

export default function AddInventory() {
    const { categories, user } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>添加新商品</h2>
                    <Link to="/inventory" style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label>分类</label>
                        <select name="category_id" required>
                            <option value="">选择分类...</option>
                            {categories.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>品牌</label>
                            <input type="text" name="brand" placeholder="例如: HP" />
                        </div>
                        <div>
                            <label>型号</label>
                            <input type="text" name="model" placeholder="例如: 1020 Plus" required />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>价格 (¥)</label>
                            <input type="number" step="0.01" name="price" placeholder="0.00" />
                        </div>
                        <div>
                            <label>初始库存</label>
                            <input type="number" name="stock_quantity" placeholder="0" />
                        </div>
                    </div>

                    <div>
                        <label>供应商</label>
                        <input type="text" name="supplier" placeholder="例如: 办公用品商店" />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={isSubmitting}>
                        {isSubmitting ? "保存中..." : "保存商品"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
