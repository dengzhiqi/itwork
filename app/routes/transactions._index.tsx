import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const type = url.searchParams.get("type"); // "IN" or "OUT" (or null for all)

    let query = `
    SELECT t.*, p.brand, p.model, c.name as category_name 
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    `;

    // Add filtering based on type
    const filters = [];
    const params: any[] = [];

    if (type === "IN") {
        filters.push("t.type = 'IN'");
    } else if (type === "OUT") {
        filters.push("t.type = 'OUT'");
    }

    if (filters.length > 0) {
        query += " WHERE " + filters.join(" AND ");
    }

    query += ` ORDER BY t.date DESC, t.id DESC LIMIT 50`;

    const { results: transactions } = await env.DB.prepare(query).bind(...params).all();

    return json({ transactions, user, type });
}

export default function Transactions() {
    const { transactions, user, type } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const currentType = searchParams.get("type") || type;

    const pageTitle = currentType === "IN" ? "入库管理" : (currentType === "OUT" ? "出库管理" : "出入库记录");

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>{pageTitle}</h2>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <Link to={`/transactions/export${currentType ? `?type=${currentType}` : ""}`} className="btn" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-light)" }} target="_blank">
                            导出 CSV
                        </Link>
                        <Link to={`/transactions/new${currentType ? `?type=${currentType}` : ""}`} className="btn btn-primary">
                            + 新增操作
                        </Link>
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "1rem" }}>日期</th>
                                {currentType && <th style={{ padding: "1rem" }}>类型</th>}
                                <th style={{ padding: "1rem" }}>分类</th>
                                <th style={{ padding: "1rem" }}>品牌型号</th>
                                <th style={{ padding: "1rem" }}>数量</th>

                                {(!currentType || currentType === "OUT") && (
                                    <th style={{ padding: "1rem" }}>部门/经手人</th>
                                )}

                                {(!currentType || currentType === "IN") && (
                                    <th style={{ padding: "1rem" }}>供货商</th>
                                )}

                                <th style={{ padding: "1rem" }}>备注</th>
                                <th style={{ padding: "1rem" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t: any) => (
                                <tr key={t.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>{new Date(t.date).toLocaleDateString()}</td>

                                    {currentType && (
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
                                                {t.type === "IN" ? "入库" : "出库"}
                                            </span>
                                        </td>
                                    )}

                                    <td style={{ padding: "1rem" }}>{t.category_name}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ fontWeight: 600 }}>{t.model}</div>
                                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.brand}</div>
                                    </td>
                                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{t.quantity}</td>

                                    {(!currentType || currentType === "OUT") && (
                                        <td style={{ padding: "1rem" }}>
                                            {t.type === "OUT" ? (
                                                <div>
                                                    <div>{t.handler_name}</div>
                                                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.department}</div>
                                                </div>
                                            ) : "-"}
                                        </td>
                                    )}

                                    {(!currentType || currentType === "IN") && (
                                        <td style={{ padding: "1rem" }}>
                                            {t.type === "IN" ? (
                                                <div style={{ color: "var(--text-accent)" }}>{t.handler_name || "-"}</div>
                                            ) : "-"}
                                        </td>
                                    )}

                                    <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{t.note || "-"}</td>
                                    <td style={{ padding: "1rem" }}>
                                        {/* Pass type to edit page for better context if needed, though id is enough */}
                                        <Link
                                            to={`/transactions/${t.id}/edit`}
                                            style={{
                                                fontSize: "0.875rem",
                                                color: "var(--text-accent)",
                                                textDecoration: "none"
                                            }}
                                        >
                                            编辑
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        暂无记录。
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
