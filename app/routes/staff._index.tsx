import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData, Form } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { results: staff } = await env.DB.prepare("SELECT * FROM staff ORDER BY department, name ASC").all();
    return json({ staff, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM staff WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    return null;
}

export default function Staff() {
    const { staff, user } = useLoaderData<typeof loader>();

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>人员管理</h2>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <Link to="/staff/new" className="btn btn-primary">
                            + 添加人员
                        </Link>
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "1rem" }}>部门</th>
                                <th style={{ padding: "1rem" }}>姓名</th>
                                <th style={{ padding: "1rem" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((s: any) => (
                                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "1rem" }}>{s.department}</td>
                                    <td style={{ padding: "1rem", fontWeight: 600 }}>{s.name}</td>
                                    <td style={{ padding: "1rem" }}>
                                        <div style={{ display: "flex", gap: "1rem" }}>
                                            <Link to={`/staff/${s.id}/edit`} style={{ fontSize: "0.875rem", color: "var(--text-accent)" }}>
                                                编辑
                                            </Link>
                                            <Form method="post" onSubmit={(e) => !confirm("确定要删除这个人员吗？") && e.preventDefault()}>
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
                            {staff.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        暂无人员。点击上方按钮添加。
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
