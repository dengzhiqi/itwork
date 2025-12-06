import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { id } = params;

    const { results: staff } = await env.DB.prepare("SELECT * FROM staff WHERE id = ?").bind(id).all();

    if (!staff || staff.length === 0) {
        throw new Response("人员未找到", { status: 404 });
    }

    // Get distinct departments from staff table
    const { results: departments } = await env.DB.prepare(
        "SELECT DISTINCT department FROM staff WHERE department IS NOT NULL AND department != '' ORDER BY department ASC"
    ).all();

    return json({ staff: staff[0], user, departments });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);
    const { id } = params;

    const formData = await request.formData();
    const department = formData.get("department");
    const name = formData.get("name");

    if (!department || !name) {
        return json({ error: "部门和姓名必填" }, { status: 400 });
    }

    await env.DB.prepare(
        "UPDATE staff SET department = ?, name = ? WHERE id = ?"
    ).bind(department, name, id).run();

    return redirect("/staff");
}

export default function EditStaff() {
    const { staff, user, departments } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>编辑人员</h2>
                    <Link to="/staff" style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label>部门 *</label>
                        <select name="department" defaultValue={staff.department} required>
                            <option value="">选择部门...</option>
                            {departments.map((dept: any) => (
                                <option key={dept.department} value={dept.department}>
                                    {dept.department}
                                </option>
                            ))}
                        </select>
                        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                            如需添加新部门，请前往"部门管理"选项卡
                        </p>
                    </div>

                    <div>
                        <label>姓名 *</label>
                        <input type="text" name="name" defaultValue={staff.name} required />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "保存中..." : "保存"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
