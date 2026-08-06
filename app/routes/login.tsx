import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { createUserSession, getSessionStorage } from "../utils/auth.server";
import "../styles/global.css";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const sessionStorage = getSessionStorage(env);
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    if (session.has("user")) return redirect("/");
    return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !username ||
        !password
    ) {
        return json({ error: "无效的表单数据" }, { status: 400 });
    }

    // Environment variable validation
    const validUser = env.ADMIN_USER;
    const validPass = env.ADMIN_PASSWORD;

    if (!validUser || !validPass) {
        return json(
            { error: "服务器配置错误。请设置 ADMIN_USER 和 ADMIN_PASSWORD。" },
            { status: 500 }
        );
    }

    if (username === validUser && password === validPass) {
        return createUserSession(request, env, username);
    }

    return json({ error: "用户名或密码错误" }, { status: 401 });
}

export default function Login() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                background: "var(--bg-app)",
            }}
        >
            <div className="glass-panel" style={{ width: "100%", maxWidth: "380px", padding: "2.5rem" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: 'var(--primary-gradient)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                            <path d="m3.3 7 8.7 5 8.7-5" />
                            <path d="M12 22V12" />
                        </svg>
                    </div>
                    <h2 style={{ textAlign: "center", marginBottom: "0.5rem" }}>ItWork</h2>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>办公用品管理系统</p>
                </div>
                <Form method="post">
                    <div style={{ marginBottom: "1rem" }}>
                        <label htmlFor="username">用户名</label>
                        <input type="text" id="username" name="username" required autoComplete="username" />
                    </div>
                    <div style={{ marginBottom: "1.5rem" }}>
                        <label htmlFor="password">密码</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {actionData?.error && (
                        <div style={{ color: "var(--danger-color)", marginBottom: "1rem", fontSize: "0.8125rem", textAlign: "center" }}>
                            {actionData.error}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "登录中..." : "登录"}
                    </button>
                </Form>
            </div>
        </div>
    );
}
