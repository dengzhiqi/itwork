import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    try {
        const currentYear = new Date().getFullYear().toString();
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Year Stats
        const { results: yearStats } = await env.DB.prepare(`
            SELECT c.name as category, 
                   SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as total_out,
                   SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as total_in
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE strftime('%Y', t.date) = ?
            GROUP BY c.id
            ORDER BY total_out DESC
        `).bind(currentYear).all();

        // Month Stats
        const { results: monthStats } = await env.DB.prepare(`
            SELECT c.name as category, 
                   SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as total_out,
                   SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as total_in
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE strftime('%Y-%m', t.date) = ?
            GROUP BY c.id
            ORDER BY total_out DESC
        `).bind(currentMonth).all();

        const totalItemsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
        const totalItems = totalItemsResult?.count || 0;

        return json({ user, totalItems, yearStats, monthStats, currentYear, currentMonth });
    } catch (error) {
        console.error("Database error:", error);
        return json({ user, totalItems: 0, yearStats: [], monthStats: [], currentYear: "", currentMonth: "" });
    }
}

export default function Index() {
    const { user, totalItems, yearStats, monthStats, currentYear, currentMonth } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                {/* Header & Quick Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ marginBottom: "0.5rem" }}>仪表盘</h1>
                        <p style={{ color: "var(--text-secondary)" }}>库存概览与统计数据 (产品总数: {totalItems})</p>
                    </div>
                    <div>
                        <Link to="/transactions/new" className="btn btn-primary">
                            快速出库
                        </Link>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
                    {/* Monthly Stats */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                            本月统计 ({currentMonth})
                        </h3>
                        {monthStats.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ color: "var(--text-secondary)", textAlign: "left", fontSize: "0.875rem" }}>
                                        <th style={{ padding: "0.5rem" }}>类别</th>
                                        <th style={{ padding: "0.5rem", textAlign: "right", color: "#fca5a5" }}>出库总数</th>
                                        <th style={{ padding: "0.5rem", textAlign: "right", color: "#86efac" }}>入库总数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthStats.map((stat: any, index: number) => (
                                        <tr key={index} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{stat.category}</td>
                                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "bold" }}>{stat.total_out}</td>
                                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "var(--text-secondary)" }}>{stat.total_in}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>本月暂无数据</p>
                        )}
                    </div>

                    {/* Annual Stats */}
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                            本年统计 ({currentYear})
                        </h3>
                        {yearStats.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ color: "var(--text-secondary)", textAlign: "left", fontSize: "0.875rem" }}>
                                        <th style={{ padding: "0.5rem" }}>类别</th>
                                        <th style={{ padding: "0.5rem", textAlign: "right", color: "#fca5a5" }}>出库总数</th>
                                        <th style={{ padding: "0.5rem", textAlign: "right", color: "#86efac" }}>入库总数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearStats.map((stat: any, index: number) => (
                                        <tr key={index} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{stat.category}</td>
                                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "bold" }}>{stat.total_out}</td>
                                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "var(--text-secondary)" }}>{stat.total_in}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>本年暂无数据</p>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
