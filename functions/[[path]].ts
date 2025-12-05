// @ts-nocheck
export async function onRequest(context) {
    try {
        const { createPagesFunctionHandler } = await import("@remix-run/cloudflare-pages");
        const build = await import("../build/server/index.js");
        const handler = createPagesFunctionHandler({ build });
        return handler(context);
    } catch (error) {
        return new Response(`Error: ${error.message}\nStack: ${error.stack}`, {
            status: 500,
            headers: { "Content-Type": "text/plain" }
        });
    }
}
