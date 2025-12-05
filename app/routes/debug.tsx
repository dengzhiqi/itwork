import type { ActionFunctionArgs } from "@remix-run/cloudflare";

export async function action({ request, context }: ActionFunctionArgs) {
    try {
        const { env } = context as { env: any };

        return new Response(JSON.stringify({
            hasDB: !!env?.DB,
            hasAdminUser: !!env?.ADMIN_USER,
            hasAdminPassword: !!env?.ADMIN_PASSWORD,
            envKeys: env ? Object.keys(env) : [],
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack,
        }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function loader() {
    return new Response("POST to this endpoint to see env debug info", {
        headers: { 'Content-Type': 'text/plain' }
    });
}
