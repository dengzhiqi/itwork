export async function onRequest() {
    return new Response("Hello from Cloudflare Pages Functions! This means the basic setup works.", {
        headers: { "Content-Type": "text/plain" }
    });
}
