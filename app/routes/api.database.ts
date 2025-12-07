import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const tables = ['categories', 'departments', 'suppliers', 'staff', 'products', 'transactions'];
    const backupData: Record<string, any[]> = {};

    try {
        for (const table of tables) {
            // Check if table exists first to avoid errors if schema mismatch
            const { results: tableExists } = await env.DB.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
            ).bind(table).all();

            if (tableExists && tableExists.length > 0) {
                const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
                backupData[table] = results;
            } else {
                backupData[table] = [];
            }
        }

        const date = new Date().toISOString().split('T')[0];
        const filename = `backup-itwork-${date}.json`;

        return new Response(JSON.stringify(backupData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`
            }
        });
    } catch (e: any) {
        console.error("Backup failed:", e);
        return new Response(`Backup failed: ${e.message}`, { status: 500 });
    }
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
            return json({ error: "请上传有效的 JSON 备份文件" }, { status: 400 });
        }

        const content = await file.text();
        let backupData;
        try {
            backupData = JSON.parse(content);
        } catch (e) {
            return json({ error: "文件格式错误，必须是有效的 JSON" }, { status: 400 });
        }

        // Tables in dependency order (children last for insert, first for delete)
        // Delete order: Reverse of Insert
        const tables = ['categories', 'departments', 'suppliers', 'staff', 'products', 'transactions'];

        // Statements to execute in batch
        const statements: any[] = [];

        // 1. Disable Foreign Keys (Specific to SQLite) - Note: D1 might not support this persisting across batch.
        // Instead, we just delete in reverse order of dependencies.
        const deleteOrder = ['transactions', 'products', 'staff', 'suppliers', 'departments', 'categories'];
        const insertOrder = ['categories', 'departments', 'suppliers', 'staff', 'products', 'transactions'];

        // Delete all data
        for (const table of deleteOrder) {
            // Check if table exists
            const { results: tableExists } = await env.DB.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
            ).bind(table).all();

            if (tableExists && tableExists.length > 0) {
                statements.push(env.DB.prepare(`DELETE FROM ${table}`));
                // Reset autoincrement
                statements.push(env.DB.prepare("DELETE FROM sqlite_sequence WHERE name=?").bind(table));
            }
        }

        // Insert new data
        for (const table of insertOrder) {
            const rows = backupData[table];
            if (Array.isArray(rows) && rows.length > 0) {
                // Get columns from the first row
                const columns = Object.keys(rows[0]);
                const placeholders = columns.map(() => '?').join(', ');
                const columnNames = columns.join(', ');

                const stmt = env.DB.prepare(
                    `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`
                );

                for (const row of rows) {
                    const values = columns.map(col => row[col]);
                    statements.push(stmt.bind(...values));
                }
            }
        }

        // Execute batch
        // D1 batch limit is high but safer to split if huge. Assuming small DB for now.
        // 128MB limit for worker script/execution, but statement count?
        // D1 batch is a proper transaction.
        await env.DB.batch(statements);

        return json({ success: true, message: "数据库恢复成功" });

    } catch (e: any) {
        console.error("Restore failed:", e);
        return json({ error: `恢复失败: ${e.message}` }, { status: 500 });
    }
}
