import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    try {
        // Stats
        const { results: lowStock } = await env.DB.prepare(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= p.min_stock_level
        ORDER BY p.stock_quantity ASC
        LIMIT 5
      `).all();

        const { results: recentTx } = await env.DB.prepare(`
        SELECT t.*, p.brand, p.model 
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        ORDER BY t.date DESC
        LIMIT 5
      `).all();

        const totalItemsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
        const totalItems = totalItemsResult?.count || 0;

        const lowStockCountResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level").first();
        const lowStockCount = lowStockCountResult?.count || 0;

        return json({ user, lowStock, recentTx, totalItems, lowStockCount });
    } catch (error) {
        console.error("Database error:", error);
        // Return empty data if DB fails
        return json({ user, lowStock: [], recentTx: [], totalItems: 0, lowStockCount: 0 });
    }
}

export default function Index() {
    const { user, lowStock, recentTx, totalItems, lowStockCount } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                {/* Welcome */}
                <div>
                    <h1 style={{ marginBottom: "0.5rem" }}>Dashboard</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Overview of office supplies and status.</p>
                </div>

                {/* Stats Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
                    <div className="glass-card" style={{ padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Products</h3>
                        <div style={{ fontSize: "2.5rem", fontWeight: 700 }}>{totalItems}</div>
                    </div>
                    <div className="glass-card" style={{ padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Low Stock Items</h3>
                        <div style={{ fontSize: "2.5rem", fontWeight: 700, color: lowStockCount > 0 ? "var(--danger-color)" : "var(--success-color)" }}>
                            {lowStockCount}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Link to="/transactions/new" className="btn btn-primary" style={{ textAlign: "center" }}>
                            Quick Outbound
                        </Link>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                {lowStock.length > 0 && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ fontSize: "1.25rem", color: "var(--danger-color)" }}>⚠️ Low Stock Alerts</h3>
                            <Link to="/inventory" style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>View All</Link>
                        </div>
                        <div style={{ display: "grid", gap: "1rem" }}>
                            {lowStock.map((item: any) => (
                                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-sm)" }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.model}</div>
                                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{item.brand} ({item.category_name})</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--danger-color)" }}>{item.stock_quantity}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Min: {item.min_stock_level}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Transactions */}
                <div className="glass-panel" style={{ padding: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem" }}>Recent Activity</h3>
                        <Link to="/transactions" style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>View History</Link>
                    </div>
                    <div style={{ width: "100%", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ color: "var(--text-secondary)", textAlign: "left", fontSize: "0.875rem" }}>
                                    <th style={{ paddingBottom: "1rem" }}>Date</th>
                                    <th style={{ paddingBottom: "1rem" }}>Type</th>
                                    <th style={{ paddingBottom: "1rem" }}>Product</th>
                                    <th style={{ paddingBottom: "1rem" }}>Qty</th>
                                    <th style={{ paddingBottom: "1rem" }}>Handler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTx.map((t: any) => (
                                    <tr key={t.id} style={{ borderTop: "1px solid var(--border-light)" }}>
                                        <td style={{ padding: "1rem 0" }}>{new Date(t.date).toLocaleDateString()}</td>
                                        <td style={{ padding: "1rem 0" }}>
                                            <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", background: t.type === "IN" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)", color: t.type === "IN" ? "#86efac" : "#fca5a5" }}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem 0" }}>{t.brand} {t.model}</td>
                                        <td style={{ padding: "1rem 0", fontWeight: 600 }}>{t.quantity}</td>
                                        <td style={{ padding: "1rem 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.handler_name || t.department || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
