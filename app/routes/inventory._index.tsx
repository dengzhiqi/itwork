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
    ORDER BY p.brand, p.model
  `).all();

    return json({ products, user });
}

export default function Inventory() {
    const { products, user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>Inventory</h2>
                    <Link to="/inventory/new" className="btn btn-primary">
                        + Add New Item
                    </Link>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "1rem" }}>Category</th>
                                <th style={{ padding: "1rem" }}>Brand / Model</th>
                                <th style={{ padding: "1rem" }}>Supplier</th>
                                <th style={{ padding: "1rem" }}>Price</th>
                                <th style={{ padding: "1rem" }}>Stock</th>
                                <th style={{ padding: "1rem" }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((item: any) => (
                                <tr key={item.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{item.category_name}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ fontWeight: 600 }}>{item.model}</div>
                                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{item.brand}</div>
                                    </td>
                                    <td style={{ padding: "1rem" }}>{item.supplier || "-"}</td>
                                    <td style={{ padding: "1rem" }}>¥{item.price?.toFixed(2)}</td>
                                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{item.stock_quantity}</td>
                                    <td style={{ padding: "1rem" }}>
                                        {item.stock_quantity <= (item.min_stock_level || 5) ? (
                                            <span style={{ color: "var(--danger-color)", fontSize: "0.875rem" }}>Low Stock</span>
                                        ) : (
                                            <span style={{ color: "var(--success-color)", fontSize: "0.875rem" }}>In Stock</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        No items found. Add one to get started.
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
