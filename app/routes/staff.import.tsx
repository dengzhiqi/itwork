import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
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
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
        return json({ error: "请选择文件" }, { status: 400 });
    }

    try {
        // Read file as ArrayBuffer first to check encoding
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Check for UTF-8 BOM (EF BB BF) - optional but good to detect
        let hasUtf8Bom = false;
        if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
            hasUtf8Bom = true;
        }

        // Try to decode as UTF-8 and check for invalid sequences
        let text;
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            text = decoder.decode(bytes);
        } catch (e) {
            return json({ error: "文件编码不是UTF-8，请将CSV文件转换为UTF-8编码后再上传" }, { status: 400 });
        }

        const lines = text.split(/\r?\n/);

        // Skip header if it exists and looks like a header (contains "部门" or "姓名")
        const startIndex = (lines[0].includes("部门") || lines[0].includes("Department")) ? 1 : 0;

        let count = 0;
        const errors = [];

        // Prepare statement for better performance
        const stmt = env.DB.prepare("INSERT INTO staff (department, name) VALUES (?, ?)");
        const batch = [];

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(/,|，/); // Support both English and Chinese commas
            if (parts.length >= 2) {
                const department = parts[0].trim();
                const name = parts[1].trim();

                if (department && name) {
                    batch.push(stmt.bind(department, name));
                    count++;
                }
            }
        }

        if (batch.length > 0) {
            // D1 batch limit is usually around 100 statements, so we might need to chunk if file is huge
            // For simplicity in this demo, assuming reasonable file size < 100 rows per upload or D1 handles it
            // Safe approach: Loop and run or chunk. Let's chunk by 50.
            const chunkSize = 50;
            for (let i = 0; i < batch.length; i += chunkSize) {
                await env.DB.batch(batch.slice(i, i + chunkSize));
            }
        }

        return json({ success: true, count });
    } catch (e) {
        console.error(e);
        return json({ error: "文件解析或导入失败，请检查格式" }, { status: 500 });
    }
}

export default function StaffImport() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    // @ts-ignore
    const user = useActionData()?.user; // This might be undefined from action, but Layout handles it or we rely on loader data which we didn't use `useLoaderData` for properly here.
    // Let's fix useLoaderData usage below

    return (
        <StaffImportView />
    );
}

import { useLoaderData as useLoaderDataOrigin } from "@remix-run/react";

function StaffImportView() {
    const { user } = useLoaderDataOrigin<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>导入人员</h2>
                    <Link to="/settings?tab=staff" style={{ color: "var(--text-secondary)" }}>返回列表</Link>
                </div>

                <div style={{ marginBottom: "2rem", padding: "1rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                    <h4 style={{ color: "#60a5fa", marginBottom: "0.5rem" }}>📝 CSV 格式说明</h4>
                    <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>请上传 UTF-8 编码的 CSV 文件，每行包含两列：</p>
                    <code style={{ display: "block", padding: "0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "4px", fontSize: "0.875rem" }}>
                        部门,姓名<br />
                        技术部,张三<br />
                        市场部,李四
                    </code>
                </div>

                {actionData?.success && (
                    <div style={{ padding: "1rem", background: "rgba(34, 197, 94, 0.1)", color: "#86efac", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                        ✅ 成功导入 {actionData.count} 条人员记录。
                    </div>
                )}

                {actionData?.error && (
                    <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                        ❌ {actionData.error}
                    </div>
                )}

                <Form method="post" encType="multipart/form-data" style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label>选择 CSV 文件</label>
                        <input
                            type="file"
                            name="file"
                            accept=".csv"
                            required
                            style={{
                                padding: "1rem",
                                border: "1px dashed var(--border-light)",
                                borderRadius: "var(--radius-sm)",
                                width: "100%",
                                cursor: "pointer"
                            }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "正在导入..." : "开始导入"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
