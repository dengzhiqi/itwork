import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    const { results: transactions } = await env.DB.prepare(`
    SELECT t.*, p.brand, p.model, c.name as category_name 
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    ORDER BY t.date DESC, t.id DESC
    LIMIT 50
  `).all();

    return json({ transactions, user });
}

export default function Transactions() {
    const { transactions, user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>Transactions</h2>
                    <Link to="/transactions/new" className="btn btn-primary">
                        + New Operation
                    </Link>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "1rem" }}>Date</th>
                                <th style={{ padding: "1rem" }}>Type</th>
                                <th style={{ padding: "1rem" }}>Item</th>
                                <th style={{ padding: "1rem" }}>Qty</th>
                                <th style={{ padding: "1rem" }}>Handler/Dept</th>
                                <th style={{ padding: "1rem" }}>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t: any) => (
                                <tr key={t.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{new Date(t.date).toLocaleDateString()}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <span
                                            style={{
                                                padding: "0.25rem 0.5rem",
                                                borderRadius: "4px",
                                                fontSize: "0.75rem",
                                                background: t.type === "IN" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                                color: t.type === "IN" ? "#86efac" : "#fca5a5",
                                            }}
                                        >
                                            {t.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ fontWeight: 600 }}>{t.model}</div>
                                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.brand}</div>
                                    </td>
                                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{t.quantity}</td>
                                    <td style={{ padding: "1rem" }}>
                                        {t.type === "OUT" ? (
                                            <div>
                                                <div>{t.department}</div>
                                                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.user}</div>
                                            </div>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{t.note || "-"}</td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        No transactions found.
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
