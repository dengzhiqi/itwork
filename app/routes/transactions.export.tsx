import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    let query = `
    SELECT 
        t.date,
        t.type,
        c.name as category,
        p.brand,
        p.model,
        t.quantity,
        t.department,
        t.handler_name as handler,
        t.note
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    `;

    const params: any[] = [];
    if (type === "IN") {
        query += " WHERE t.type = ?";
        params.push("IN");
    } else if (type === "OUT") {
        query += " WHERE t.type = ?";
        params.push("OUT");
    }

    query += " ORDER BY t.date DESC, t.id DESC";

    try {
        const { results: transactions } = await env.DB.prepare(query).bind(...params).all();

        // CSV Header
        const header = ["日期", "类型", "分类", "品牌", "型号", "数量", "部门", "经手人", "备注"];

        // CSV Rows
        const rows = (transactions as any[]).map((t: any) => [
            new Date(t.date).toLocaleDateString(),
            t.type === "IN" ? "入库" : "出库",
            t.category,
            t.brand,
            t.model,
            t.quantity,
            t.department || "",
            t.handler || "",
            (t.note || "").replace(/"/g, '""') // Escape quotes
        ]);

        // Combine
        const csvContent = [
            header.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        // Add BOM for Excel compatibility with UTF-8
        const bom = "\uFEFF";
        const finalContent = bom + csvContent;

        const filename = `transactions${type ? `-${type}` : ""}-${new Date().toISOString().split('T')[0]}.csv`;

        return new Response(finalContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`
            }
        });
    } catch (e: any) {
        console.error("Export error:", e);
        return new Response(`Export failed: ${e.message}`, { status: 500 });
    }
}
