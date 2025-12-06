import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { id } = params;

    const { results: suppliers } = await env.DB.prepare("SELECT * FROM suppliers WHERE id = ?").bind(id).all();

    if (!suppliers || suppliers.length === 0) {
        throw new Response("供应商未找到", { status: 404 });
    }

    return json({ supplier: suppliers[0], user });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);
    const { id } = params;

    const formData = await request.formData();
    const company_name = formData.get("company_name");
    const contact_person = formData.get("contact_person");
    const phone = formData.get("phone");
    const email = formData.get("email");

    if (!company_name) {
        return json({ error: "公司名称必填" }, { status: 400 });
    }

    await env.DB.prepare(
        "UPDATE suppliers SET company_name = ?, contact_person = ?, phone = ?, email = ? WHERE id = ?"
    ).bind(company_name, contact_person, phone, email, id).run();

    return redirect("/settings?tab=suppliers");
}

export default function EditSupplier() {
    const { supplier, user } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>编辑供应商</h2>
                    <Link to="/settings?tab=suppliers" style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label>公司名称 *</label>
                        <input type="text" name="company_name" defaultValue={supplier.company_name} required />
                    </div>

                    <div>
                        <label>联系人</label>
                        <input type="text" name="contact_person" defaultValue={supplier.contact_person || ""} />
                    </div>

                    <div>
                        <label>电话</label>
                        <input type="tel" name="phone" defaultValue={supplier.phone || ""} />
                    </div>

                    <div>
                        <label>邮箱</label>
                        <input type="email" name="email" defaultValue={supplier.email || ""} />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "保存中..." : "保存"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
