import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useNavigation, Link } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    return json({ user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const company_name = formData.get("company_name");
    const contact_person = formData.get("contact_person");
    const phone = formData.get("phone");

    if (!company_name) {
        return json({ error: "公司名称必填" }, { status: 400 });
    }

    await env.DB.prepare(
        "INSERT INTO suppliers (company_name, contact_person, phone) VALUES (?, ?, ?)"
    ).bind(company_name, contact_person, phone).run();

    return redirect("/suppliers");
}

export default function NewSupplier() {
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Layout user={undefined}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>添加供应商</h2>
                    <Link to="/suppliers" style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label>公司名称 *</label>
                        <input type="text" name="company_name" required />
                    </div>

                    <div>
                        <label>联系人</label>
                        <input type="text" name="contact_person" />
                    </div>

                    <div>
                        <label>电话</label>
                        <input type="tel" name="phone" />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "保存中..." : "保存"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
