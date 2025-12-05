import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get all products for selection
    const { results: products } = await env.DB.prepare(`
    SELECT p.id, p.brand, p.model, p.stock_quantity, c.name as category 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY c.name, p.brand
  `).all();

    return json({ products, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const type = formData.get("type");
    const product_id = formData.get("product_id");
    const quantity = parseInt(formData.get("quantity") as string);
    const date = formData.get("date");
    const department = formData.get("department");
    const handler_name = formData.get("handler_name");
    const note = formData.get("note");

    if (!product_id || !quantity || !type) {
        return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update Stock
    // Use a transaction or batch if possible. D1 supports batch.
    // We need to check stock for OUT.

    if (type === "OUT") {
        // Check stock
        const { results } = await env.DB.prepare("SELECT stock_quantity FROM products WHERE id = ?").bind(product_id).all();
        const currentStock = results[0]?.stock_quantity || 0;
        if (currentStock < quantity) {
            return json({ error: `Insufficient stock (Current: ${currentStock})` }, { status: 400 });
        }

        await env.DB.batch([
            env.DB.prepare("INSERT INTO transactions (product_id, type, quantity, department, handler_name, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(product_id, type, quantity, department, handler_name, date || new Date().toISOString(), note),
            env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?").bind(quantity, product_id)
        ]);
    } else {
        // IN
        await env.DB.batch([
            env.DB.prepare("INSERT INTO transactions (product_id, type, quantity, date, note) VALUES (?, ?, ?, ?, ?)").bind(product_id, type, quantity, date || new Date().toISOString(), note),
            env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?").bind(quantity, product_id)
        ]);
    }

    return redirect("/transactions");
}

export default function NewTransaction() {
    const { products, user } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const actionData = navigation.formAction === "/transactions/new" ? null : (useNavigation().formMethod ? null : null); // Simple error handling

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>记录出入库</h2>
                    <Link to="/transactions" style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>类型</label>
                            <select name="type" required>
                                <option value="OUT">出库 (使用)</option>
                                <option value="IN">入库 (补货)</option>
                            </select>
                        </div>
                        <div>
                            <label>日期</label>
                            <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>
                    </div>

                    <div>
                        <label>产品</label>
                        <select name="product_id" required style={{ fontFamily: "monospace" }}>
                            <option value="">选择商品...</option>
                            {products.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    [{p.category}] {p.brand} {p.model} (库存: {p.stock_quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>数量</label>
                        <input type="number" name="quantity" min="1" defaultValue="1" required />
                    </div>

                    {/* Conditional fields could be done with JS/State, but for now show all optional or use CSS peer selectors? 
              Simpler to show all but label properly. */}

                    <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
                        <h4 style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>仅限出库时填写</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label>部门</label>
                                <select name="department">
                                    <option value="">选择部门...</option>
                                    <option value="IT">IT</option>
                                    <option value="HR">人力资源</option>
                                    <option value="Sales">销售</option>
                                    <option value="Finance">财务</option>
                                    <option value="Ops">运营</option>
                                </select>
                            </div>
                            <div>
                                <label>经手人</label>
                                <input type="text" name="handler_name" placeholder="谁领取的?" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label>备注 / 供应商信息</label>
                        <textarea name="note" rows={3}></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={isSubmitting}>
                        {isSubmitting ? "处理中..." : "确认操作"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
