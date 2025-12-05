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
        return json({ error: "Invalid form data" }, { status: 400 });
    }

    // Environment variable validation
    const validUser = env.ADMIN_USER;
    const validPass = env.ADMIN_PASSWORD;

    if (!validUser || !validPass) {
        return json(
            { error: "Server misconfiguration. Please set ADMIN_USER and ADMIN_PASSWORD." },
            { status: 500 }
        );
    }

    if (username === validUser && password === validPass) {
        return createUserSession(request, env, username);
    }

    return json({ error: "Invalid credentials" }, { status: 401 });
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
            <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}>
                <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>ItWork Login</h2>
                <Form method="post">
                    <div style={{ marginBottom: "1rem" }}>
                        <label htmlFor="username">Username</label>
                        <input type="text" id="username" name="username" required autoComplete="username" />
                    </div>
                    <div style={{ marginBottom: "2rem" }}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    {actionData?.error && (
                        <div style={{ color: "var(--danger-color)", marginBottom: "1rem", fontSize: "0.875rem" }}>
                            {actionData.error}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Signing In..." : "Sign In"}
                    </button>
                </Form>
            </div>
        </div>
    );
}
