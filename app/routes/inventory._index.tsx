import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, Form } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    const { results: products } = await env.DB.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.id 
    ORDER BY c.name, p.brand, p.model
  `).all();

    return json({ products, user });
}

export default function Inventory() {
    const { products, user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <img src="/icons/inventory.svg" alt="" style={{ width: "32px", height: "32px" }} />
                        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>库存管理</h2>
                    </div>
                    <Link to="/inventory/new" className="btn btn-primary">
                        + 添加新商品
                    </Link>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "0.6rem 0.75rem" }}>分类</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>品牌 / 型号</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>价格</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>库存</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>备注</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((item: any) => (
                                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{item.category_name}</td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        <div style={{ fontWeight: 600 }}>{item.model}</div>
                                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{item.brand}</div>
                                    </td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>¥{item.price?.toFixed(2)}</td>
                                    <td style={{ padding: "0.6rem 0.75rem", color: item.stock_quantity === 0 ? "var(--danger-color)" : "inherit" }}>{item.stock_quantity}</td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>{item.supplier || "-"}</td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        <Link to={`/inventory/${item.id}/edit`} style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>
                                            编辑
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        暂无商品。点击上方按钮添加。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
