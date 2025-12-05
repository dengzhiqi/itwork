import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData, Form } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { results: suppliers } = await env.DB.prepare("SELECT * FROM suppliers ORDER BY company_name ASC").all();
    return json({ suppliers, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM suppliers WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    return null;
}

export default function Suppliers() {
    const { suppliers, user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>供应商管理</h2>
                    <Link to="/suppliers/new" className="btn btn-primary">
                        + 添加供应商
                    </Link>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "1rem" }}>公司名称</th>
                                <th style={{ padding: "1rem" }}>联系人</th>
                                <th style={{ padding: "1rem" }}>电话</th>
                                <th style={{ padding: "1rem" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((s: any) => (
                                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "1rem", fontWeight: 600 }}>{s.company_name}</td>
                                    <td style={{ padding: "1rem" }}>{s.contact_person || "-"}</td>
                                    <td style={{ padding: "1rem" }}>{s.phone || "-"}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ display: "flex", gap: "1rem" }}>
                                            <Link to={`/suppliers/${s.id}/edit`} style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>
                                                编辑
                                            </Link>
                                            <Form method="post" onSubmit={(e) => !confirm("确定要删除这个供应商吗？") && e.preventDefault()}>
                                                <input type="hidden" name="intent" value="delete" />
                                                <input type="hidden" name="id" value={s.id} />
                                                <button type="submit" style={{ background: "none", border: "none", color: "var(--danger-color)", fontSize: "0.875rem", cursor: "pointer" }}>
                                                    删除
                                                </button>
                                            </Form>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {suppliers.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        暂无供应商。点击上方按钮添加。
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
