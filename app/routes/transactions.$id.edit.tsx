import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { id } = params;

    // Get the transaction
    const { results: transactions } = await env.DB.prepare(`
        SELECT t.*, p.brand, p.model, c.name as category_name, p.id as product_id
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE t.id = ?
    `).bind(id).all();

    if (!transactions || transactions.length === 0) {
        throw new Response("记录未找到", { status: 404 });
    }

    return json({ transaction: transactions[0], user });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);
    const { id } = params;

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        // Get transaction details first
        const { results: transactions } = await env.DB.prepare(`
            SELECT t.*, p.id as product_id
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.id = ?
        `).bind(id).all();

        if (transactions && transactions.length > 0) {
            const t = transactions[0];

            // Restore stock
            if (t.type === "OUT") {
                // Outbound was reducing stock, so add it back
                await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
                    .bind(t.quantity, t.product_id).run();
            } else if (t.type === "IN") {
                // Inbound was adding stock, so subtract it back
                await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
                    .bind(t.quantity, t.product_id).run();
            }

            // Delete the transaction
            await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();
        }

        return redirect("/transactions");
    }

    // Update action
    const date = formData.get("date");
    const department = formData.get("department");
    const handler_name = formData.get("handler_name");
    const note = formData.get("note");

    // Update only the editable fields (not product, quantity, or type)
    await env.DB.prepare(`
        UPDATE transactions 
        SET date = ?, department = ?, handler_name = ?, note = ?
        WHERE id = ?
    `).bind(date, department, handler_name, note, id).run();

    return redirect("/transactions");
}

export default function EditTransaction() {
    const { transaction, user } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>编辑出入库记录</h2>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <Form method="post" onSubmit={(e) => !confirm("确定要删除这条记录吗？库存将会恢复。") && e.preventDefault()}>
                            <input type="hidden" name="intent" value="delete" />
                            <button
                                type="submit"
                                style={{
                                    background: "none",
                                    border: "1px solid var(--danger-color)",
                                    color: "var(--danger-color)",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "var(--radius-sm)",
                                    cursor: "pointer",
                                    fontSize: "0.875rem"
                                }}
                            >
                                删除
                            </button>
                        </Form>
                        <Link to="/transactions" style={{ color: "var(--text-secondary)" }}>取消</Link>
                    </div>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <input type="hidden" name="intent" value="update" />
                    {/* Read-only fields */}
                    <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
                        <h4 style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>不可修改的信息</h4>
                        <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
                            <div><strong>类型：</strong>{transaction.type === "IN" ? "入库" : "出库"}</div>
                            <div><strong>商品：</strong>[{transaction.category_name}] {transaction.brand} {transaction.model}</div>
                            <div><strong>数量：</strong>{transaction.quantity}</div>
                        </div>
                    </div>

                    {/* Editable fields */}
                    <div>
                        <label>日期</label>
                        <input
                            type="date"
                            name="date"
                            defaultValue={transaction.date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    {transaction.type === "OUT" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label>部门</label>
                                <select name="department" defaultValue={transaction.department || ""}>
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
                                <input type="text" name="handler_name" defaultValue={transaction.handler_name || ""} placeholder="谁领取的?" />
                            </div>
                        </div>
                    )}

                    {transaction.type === "IN" && (
                        <>
                            <input type="hidden" name="department" value="" />
                            <input type="hidden" name="handler_name" value="" />
                        </>
                    )}

                    <div>
                        <label>备注 / 供应商信息</label>
                        <textarea name="note" rows={3} defaultValue={transaction.note || ""}></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={isSubmitting}>
                        {isSubmitting ? "保存中..." : "保存修改"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
