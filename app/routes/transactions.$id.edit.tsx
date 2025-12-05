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
                    <Link to="/transactions" style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
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
