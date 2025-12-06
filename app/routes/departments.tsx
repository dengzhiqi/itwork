import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get all departments with staff count
    const { results: departments } = await env.DB.prepare(`
        SELECT 
            department,
            COUNT(*) as staff_count
        FROM staff 
        WHERE department IS NOT NULL AND department != ''
        GROUP BY department
        ORDER BY department ASC
    `).all();

    return json({ user, departments });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const action = formData.get("_action");
    const oldName = formData.get("oldName");
    const newName = formData.get("newName");

    if (action === "rename" && oldName && newName) {
        // Rename department for all staff
        await env.DB.prepare(
            "UPDATE staff SET department = ? WHERE department = ?"
        ).bind(newName, oldName).run();

        // Also update transactions if they have department field
        await env.DB.prepare(
            "UPDATE transactions SET department = ? WHERE department = ?"
        ).bind(newName, oldName).run();

        return json({ success: true, message: "部门已重命名" });
    }

    if (action === "delete" && oldName) {
        // Check if department has staff
        const { results: staff } = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM staff WHERE department = ?"
        ).bind(oldName).all();

        if (staff[0].count > 0) {
            return json({
                error: `无法删除部门"${oldName}"，该部门还有 ${staff[0].count} 名人员`
            }, { status: 400 });
        }

        // If no staff, we don't need to delete anything since department is just a field value
        return json({ success: true, message: "部门已删除" });
    }

    return json({ error: "无效操作" }, { status: 400 });
}

export default function Departments() {
    const { user, departments } = useLoaderData<typeof loader>();
    const [editingDept, setEditingDept] = useState<string | null>(null);
    const [newName, setNewName] = useState("");

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ marginBottom: "0.5rem" }}>部门管理</h1>
                        <p style={{ color: "var(--text-secondary)" }}>管理所有部门信息</p>
                    </div>
                    <Link to="/staff" className="btn btn-secondary">
                        返回人员列表
                    </Link>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid var(--border-light)" }}>
                                <th style={{ padding: "1rem", textAlign: "left" }}>部门名称</th>
                                <th style={{ padding: "1rem", textAlign: "center" }}>人员数量</th>
                                <th style={{ padding: "1rem", textAlign: "right" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        暂无部门
                                    </td>
                                </tr>
                            ) : (
                                departments.map((dept: any) => (
                                    <tr key={dept.department} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                        <td style={{ padding: "1rem" }}>
                                            {editingDept === dept.department ? (
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    style={{ width: "100%", maxWidth: "300px" }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <strong>{dept.department}</strong>
                                            )}
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "center" }}>
                                            <span style={{
                                                background: "var(--bg-secondary)",
                                                padding: "0.25rem 0.75rem",
                                                borderRadius: "var(--radius-sm)",
                                                fontWeight: "bold"
                                            }}>
                                                {dept.staff_count} 人
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "right" }}>
                                            {editingDept === dept.department ? (
                                                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                    <Form method="post" style={{ display: "inline" }}>
                                                        <input type="hidden" name="_action" value="rename" />
                                                        <input type="hidden" name="oldName" value={dept.department} />
                                                        <input type="hidden" name="newName" value={newName} />
                                                        <button
                                                            type="submit"
                                                            className="btn btn-primary"
                                                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                            disabled={!newName || newName === dept.department}
                                                        >
                                                            保存
                                                        </button>
                                                    </Form>
                                                    <button
                                                        onClick={() => {
                                                            setEditingDept(null);
                                                            setNewName("");
                                                        }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                    >
                                                        取消
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingDept(dept.department);
                                                            setNewName(dept.department);
                                                        }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                    >
                                                        重命名
                                                    </button>
                                                    <Form method="post" style={{ display: "inline" }}>
                                                        <input type="hidden" name="_action" value="delete" />
                                                        <input type="hidden" name="oldName" value={dept.department} />
                                                        <button
                                                            type="submit"
                                                            className="btn btn-danger"
                                                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                            disabled={dept.staff_count > 0}
                                                            onClick={(e) => {
                                                                if (!confirm(`确定要删除部门"${dept.department}"吗？`)) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                        >
                                                            删除
                                                        </button>
                                                    </Form>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem", background: "rgba(59, 130, 246, 0.1)" }}>
                    <h3 style={{ marginBottom: "0.5rem" }}>💡 使用说明</h3>
                    <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem", color: "var(--text-secondary)" }}>
                        <li>点击"重命名"可以修改部门名称，所有该部门的人员会自动更新</li>
                        <li>只有没有人员的部门才能删除</li>
                        <li>在添加人员时可以创建新部门</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
