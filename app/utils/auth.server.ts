import { createCookieSessionStorage, redirect } from "@remix-run/cloudflare";

type Env = {
    ADMIN_USER?: string;
    ADMIN_PASSWORD?: string;
    SESSION_SECRET?: string;
};

export function getSessionStorage(env: Env) {
    return createCookieSessionStorage({
        cookie: {
            name: "__session",
            httpOnly: true,
            path: "/",
            sameSite: "lax",
            secrets: [env.SESSION_SECRET || "default-secret"],
            secure: true, // Always true for CF Pages in prod usually
            maxAge: 60 * 60 * 24 * 7, // 1 week
        },
    });
}

export async function authenticate(request: Request, env: Env) {
    const sessionStorage = getSessionStorage(env);
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    const user = session.get("user");
    if (!user) return null;
    return user;
}

export async function requireUser(request: Request, env: Env) {
    const user = await authenticate(request, env);
    if (!user) {
        throw redirect("/login");
    }
    return user;
}

export async function createUserSession(request: Request, env: Env, username: string) {
    const sessionStorage = getSessionStorage(env);
    const session = await sessionStorage.getSession();
    session.set("user", username);
    return redirect("/", {
        headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
        },
    });
}

export async function logout(request: Request, env: Env) {
    const sessionStorage = getSessionStorage(env);
    const session = await sessionStorage.getSession(request.headers.get("Cookie"));
    return redirect("/login", {
        headers: {
            "Set-Cookie": await sessionStorage.destroySession(session),
        },
    });
}
