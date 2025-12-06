import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, Form, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get all staff
    const { results: staff } = await env.DB.prepare("SELECT * FROM staff ORDER BY department, name ASC").all();

    // Get departments with staff count
    const { results: departments } = await env.DB.prepare(`
        SELECT 
            department,
            COUNT(*) as staff_count
        FROM staff 
        WHERE department IS NOT NULL AND department != ''
        GROUP BY department
        ORDER BY department ASC
    `).all();

    return json({ staff, departments, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const action = formData.get("_action");

    // Staff delete
    if (action === "deleteStaff") {
        const id = formData.get("id");
        await env.DB.prepare("DELETE FROM staff WHERE id = ?").bind(id).run();
        return json({ success: true });
    }

    // Department rename
    if (action === "renameDept") {
        const oldName = formData.get("oldName");
        const newName = formData.get("newName");

        await env.DB.prepare(
            "UPDATE staff SET department = ? WHERE department = ?"
        ).bind(newName, oldName).run();

        await env.DB.prepare(
            "UPDATE transactions SET department = ? WHERE department = ?"
        ).bind(newName, oldName).run();

        return json({ success: true, message: "部门已重命名" });
    }

    // Department delete
    if (action === "deleteDept") {
        const deptName = formData.get("deptName");

        const { results: staffCount } = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM staff WHERE department = ?"
        ).bind(deptName).all();

        if (staffCount[0].count > 0) {
            return json({
                error: `无法删除部门"${deptName}"，该部门还有 ${staffCount[0].count} 名人员`
            }, { status: 400 });
        }

        return json({ success: true, message: "部门已删除" });
    }

    // Add department
    if (action === "addDept") {
        const deptName = formData.get("deptName");

        if (!deptName) {
            return json({ error: "部门名称不能为空" }, { status: 400 });
        }

        // Check if department already exists
        const { results: existing } = await env.DB.prepare(
            "SELECT COUNT(*) as count FROM staff WHERE department = ?"
        ).bind(deptName).all();

        if (existing[0].count > 0) {
            return json({ error: "该部门已存在" }, { status: 400 });
        }

        // Create a placeholder staff member to create the department
        // Or we can just return success since departments are created when staff is added
        return json({ success: true, message: "部门将在添加人员时创建" });
    }

    return json({ success: false });
}

export default function Staff() {
    const { staff, departments, user } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "staff";

    const [editingDept, setEditingDept] = useState<string | null>(null);
    const [newDeptName, setNewDeptName] = useState("");
    const [addingDept, setAddingDept] = useState(false);
    const [newDept, setNewDept] = useState("");

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                <div>
                    <h1 style={{ marginBottom: "0.5rem" }}>人员与部门管理</h1>
                    <p style={{ color: "var(--text-secondary)" }}>管理组织架构和人员信息</p>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid var(--border-light)" }}>
                    <button
                        onClick={() => setSearchParams({ tab: "staff" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "staff" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "staff" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "staff" ? "bold" : "normal",
                            cursor: "pointer",
                            marginBottom: "-2px"
                        }}
                    >
                        人员管理
                    </button>
                    <button
                        onClick={() => setSearchParams({ tab: "departments" })}
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "departments" ? "2px solid var(--text-accent)" : "2px solid transparent",
                            color: activeTab === "departments" ? "var(--text-accent)" : "var(--text-secondary)",
                            fontWeight: activeTab === "departments" ? "bold" : "normal",
                            cursor: "pointer",
                            marginBottom: "-2px"
                        }}
                    >
                        部门管理
                    </button>
                </div>

                {/* Departments Tab */}
                {activeTab === "departments" && (
                    <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0 }}>部门列表</h3>
                            {!addingDept && (
                                <button
                                    onClick={() => setAddingDept(true)}
                                    className="btn btn-primary"
                                    style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                                >
                                    + 添加部门
                                </button>
                            )}
                        </div>

                        {addingDept && (
                            <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                    <input
                                        type="text"
                                        value={newDept}
                                        onChange={(e) => setNewDept(e.target.value)}
                                        placeholder="输入新部门名称"
                                        style={{ flex: 1 }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            if (newDept.trim()) {
                                                // Just close the form, department will be created when staff is added
                                                alert(`部门"${newDept}"将在添加人员时自动创建`);
                                                setNewDept("");
                                                setAddingDept(false);
                                            }
                                        }}
                                        className="btn btn-primary"
                                        style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                                    >
                                        确认
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewDept("");
                                            setAddingDept(false);
                                        }}
                                        className="btn btn-secondary"
                                        style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                                    >
                                        取消
                                    </button>
                                </div>
                                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                    提示：部门会在添加第一个人员时自动创建
                                </p>
                            </div>
                        )}

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
                                            暂无部门。添加人员时会自动创建部门。
                                        </td>
                                    </tr>
                                ) : (
                                    departments.map((dept: any) => (
                                        <tr key={dept.department} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                            <td style={{ padding: "1rem" }}>
                                                {editingDept === dept.department ? (
                                                    <input
                                                        type="text"
                                                        value={newDeptName}
                                                        onChange={(e) => setNewDeptName(e.target.value)}
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
                                                            <input type="hidden" name="_action" value="renameDept" />
                                                            <input type="hidden" name="oldName" value={dept.department} />
                                                            <input type="hidden" name="newName" value={newDeptName} />
                                                            <button
                                                                type="submit"
                                                                className="btn btn-primary"
                                                                style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                                disabled={!newDeptName || newDeptName === dept.department}
                                                            >
                                                                保存
                                                            </button>
                                                        </Form>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDept(null);
                                                                setNewDeptName("");
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
                                                                setNewDeptName(dept.department);
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                                                        >
                                                            重命名
                                                        </button>
                                                        <Form method="post" style={{ display: "inline" }}>
                                                            <input type="hidden" name="_action" value="deleteDept" />
                                                            <input type="hidden" name="deptName" value={dept.department} />
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
                )}

                {/* Staff Tab */}
                {activeTab === "staff" && (
                    <div className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                            <h3 style={{ margin: 0 }}>人员列表</h3>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <Link to="/staff/import" className="btn" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-light)" }}>
                                    导入 CSV
                                </Link>
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
                                                        <input type="hidden" name="_action" value="deleteStaff" />
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
                )}
            </div>
        </Layout>
    );
}
