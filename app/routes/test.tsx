export async function loader() {
    return new Response("Hello from ItWork! If you see this, the basic routing works.", {
        headers: { "Content-Type": "text/plain" }
    });
}

export default function Test() {
    return <div>Test Page</div>;
}
