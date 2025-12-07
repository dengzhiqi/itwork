import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, Form, useNavigation, useActionData } from "@remix-run/react";
import { useState, useEffect } from "react";
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

    if (intent === "create") {
        const company_name = formData.get("company_name");
        const contact_person = formData.get("contact_person");
        const phone = formData.get("phone");

        if (!company_name) {
            return json({ error: "公司名称必填" }, { status: 400 });
        }

        await env.DB.prepare(
            "INSERT INTO suppliers (company_name, contact_person, phone) VALUES (?, ?, ?)"
        ).bind(company_name, contact_person, phone).run();

        return json({ success: true, message: "供应商已添加" });
    }

    return null;
}

export default function Suppliers() {
    const { suppliers, user } = useLoaderData<typeof loader>();
    const actionData = useActionData<{ success?: boolean; error?: string; message?: string }>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (actionData?.success && isAdding) {
            setIsAdding(false);
        }
    }, [actionData, isAdding]);

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ margin: 0 }}>供应商管理</h2>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="btn btn-primary"
                        >
                            + 添加新供应商
                        </button>
                    )}
                </div>

                {isAdding && (
                    <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                        <Form method="post" style={{ display: "grid", gap: "1rem" }}>
                            <input type="hidden" name="intent" value="create" />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label>公司名称 *</label>
                                    <input type="text" name="company_name" required placeholder="输入公司名称" autoFocus />
                                </div>
                                <div>
                                    <label>联系人</label>
                                    <input type="text" name="contact_person" placeholder="输入联系人" />
                                </div>
                                <div>
                                    <label>电话</label>
                                    <input type="tel" name="phone" placeholder="输入电话号码" />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.5rem 1.5rem" }}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ padding: "0.5rem 1.5rem" }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "保存中..." : "保存"}
                                </button>
                            </div>
                        </Form>
                    </div>
                )}

                <div style={{ overflowX: "auto" }}>
                    {/* Table remains same but wrapped to ensure structure */}
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
