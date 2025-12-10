import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const { id } = params;

    // Get the transaction
    const { results: transactions } = await env.DB.prepare(`
        SELECT t.*, p.brand, p.model, c.name as category_name, p.id as product_id
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE t.id = ?
    `).bind(id).all();

    if (!transactions || transactions.length === 0) {
        throw new Response("记录未找到", { status: 404 });
    }

    // Get all products for the dropdown
    const { results: products } = await env.DB.prepare(`
        SELECT p.id, p.brand, p.model, p.stock_quantity, c.name as category 
        FROM products p
        JOIN categories c ON p.category_id = c.id
        ORDER BY c.name, p.brand
    `).all();

    // Get staff and suppliers
    const { results: staff } = await env.DB.prepare("SELECT * FROM staff ORDER BY department, name").all();
    const { results: suppliers } = await env.DB.prepare("SELECT * FROM suppliers ORDER BY company_name").all();
    const { results: departments } = await env.DB.prepare("SELECT name FROM departments ORDER BY name ASC").all();
    const { results: categories } = await env.DB.prepare("SELECT id, name FROM categories ORDER BY name ASC").all();

    return json({ transaction: transactions[0], products, staff, suppliers, departments, categories, user });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);
    const { id } = params;

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        // Get transaction details first
        const { results: transactions } = await env.DB.prepare(`
            SELECT t.*, p.id as product_id
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.id = ?
        `).bind(id).all();

        if (transactions && transactions.length > 0) {
            const t = transactions[0];

            // Restore stock
            if (t.type === "OUT") {
                await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
                    .bind(t.quantity, t.product_id).run();
            } else if (t.type === "IN") {
                await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
                    .bind(t.quantity, t.product_id).run();
            }

            // Delete the transaction
            await env.DB.prepare("DELETE FROM transactions WHERE id = ?").bind(id).run();

            const redirectPath = t.type === "OUT" ? "/transactions?type=OUT" : "/transactions?type=IN";
            return redirect(redirectPath);
        }

        return redirect("/transactions");
    }

    // Update action - now handles all fields including product and quantity
    // NOTE: Type is locked and cannot be changed during edit
    const product_id = formData.get("product_id");
    const quantity = parseInt(formData.get("quantity") as string);
    const date = formData.get("date");
    const department = formData.get("department");
    const handler_name = formData.get("handler_name");
    const note = formData.get("note");

    // Get old transaction data
    const { results: oldTransactions } = await env.DB.prepare(`
        SELECT * FROM transactions WHERE id = ?
    `).bind(id).all();

    if (!oldTransactions || oldTransactions.length === 0) {
        return json({ error: "记录未找到" }, { status: 404 });
    }

    const oldTransaction = oldTransactions[0];
    // Use the original type - type cannot be changed during edit
    const type = oldTransaction.type;

    // Restore old stock changes
    if (oldTransaction.type === "OUT") {
        await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
            .bind(oldTransaction.quantity, oldTransaction.product_id).run();
    } else if (oldTransaction.type === "IN") {
        await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
            .bind(oldTransaction.quantity, oldTransaction.product_id).run();
    }

    // Check stock for new OUT transaction
    if (type === "OUT") {
        const { results } = await env.DB.prepare("SELECT stock_quantity FROM products WHERE id = ?").bind(product_id).all();
        const currentStock = results[0]?.stock_quantity || 0;
        if (currentStock < quantity) {
            // Restore the old transaction's stock changes before returning error
            if (oldTransaction.type === "OUT") {
                await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
                    .bind(oldTransaction.quantity, oldTransaction.product_id).run();
            } else if (oldTransaction.type === "IN") {
                await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
                    .bind(oldTransaction.quantity, oldTransaction.product_id).run();
            }
            return json({ error: `库存不足 (当前: ${currentStock})` }, { status: 400 });
        }
    }

    // Apply new stock changes
    if (type === "OUT") {
        await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
            .bind(quantity, product_id).run();
    } else if (type === "IN") {
        await env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
            .bind(quantity, product_id).run();
    }

    // Get current product price for snapshot
    const { results: productResults } = await env.DB.prepare("SELECT price FROM products WHERE id = ?").bind(product_id).all();
    const price = productResults[0]?.price || 0;

    // Update the transaction
    await env.DB.prepare(`
        UPDATE transactions 
        SET type = ?, product_id = ?, quantity = ?, price = ?, date = ?, department = ?, handler_name = ?, note = ?
        WHERE id = ?
    `).bind(type, product_id, quantity, price, date, department, handler_name, note, id).run();

    const redirectPath = type === "OUT" ? "/transactions?type=OUT" : "/transactions?type=IN";
    return redirect(redirectPath);
}

export default function EditTransaction() {
    const { transaction, products, staff, suppliers, departments: loadedDepartments, categories: loadedCategories, user } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const [selectedDepartment, setSelectedDepartment] = useState(transaction.department || "");
    const [selectedHandler, setSelectedHandler] = useState(transaction.handler_name || "");
    const [selectedCategory, setSelectedCategory] = useState(transaction.category_name || "");
    const [transactionType, setTransactionType] = useState(transaction.type);

    const departments = (loadedDepartments as any[]).map(d => d.name);
    const categories = (loadedCategories as any[]).map(c => c.name);

    // Clear handler when department changes
    useEffect(() => {
        setSelectedHandler("");
    }, [selectedDepartment]);

    // Derive filteredStaff directly from props/state to ensure it's available on first render
    const filteredStaff = selectedDepartment
        ? (staff as any[]).filter(s => s.department === selectedDepartment)
        : [];

    // Filter products by category
    const filteredProducts = selectedCategory
        ? (products as any[]).filter(p => p.category === selectedCategory)
        : [];

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>编辑{transactionType === "OUT" ? "出库" : "入库"}记录</h2>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <Form method="post" onSubmit={(e) => !confirm("确定要删除这条记录吗？库存将会恢复。") && e.preventDefault()}>
                            <input type="hidden" name="intent" value="delete" />
                            <button
                                type="submit"
                                style={{
                                    background: "none",
                                    border: "1px solid var(--danger-color)",
                                    color: "var(--danger-color)",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "var(--radius-sm)",
                                    cursor: "pointer",
                                    fontSize: "0.875rem"
                                }}
                            >
                                删除
                            </button>
                        </Form>
                        <Link to={`/transactions?type=${transaction.type}`} style={{ color: "var(--text-secondary)" }}>取消</Link>
                    </div>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <input type="hidden" name="intent" value="update" />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>类型 <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>(已锁定)</span></label>
                            <input type="hidden" name="type" value={transactionType} />
                            <select
                                value={transactionType}
                                disabled
                                style={{
                                    cursor: "not-allowed",
                                    opacity: 0.6,
                                    backgroundColor: "rgba(0,0,0,0.3)"
                                }}
                            >
                                <option value="OUT">出库 (使用)</option>
                                <option value="IN">入库 (补货)</option>
                            </select>
                        </div>
                        <div>
                            <label>日期</label>
                            <input
                                type="date"
                                name="date"
                                defaultValue={transaction.date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>分类</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                required
                            >
                                <option value="">选择分类...</option>
                                {categories.map((cat: string) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>商品</label>
                            <select name="product_id" defaultValue={transaction.product_id} disabled={!selectedCategory} required style={{ fontFamily: "monospace" }}>
                                <option value="">选择商品...</option>
                                {filteredProducts.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                        {p.brand} {p.model} (库存: {p.stock_quantity})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label>数量</label>
                        <input type="number" name="quantity" min="1" defaultValue={transaction.quantity} required />
                    </div>

                    {transactionType === "OUT" && (
                        <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
                            <h4 style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>出库信息</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label>部门</label>
                                    <select
                                        name="department"
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        required
                                    >
                                        <option value="">选择部门...</option>
                                        {departments.map((dept: string) => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>经手人</label>
                                    <select
                                        name="handler_name"
                                        value={selectedHandler}
                                        onChange={(e) => setSelectedHandler(e.target.value)}
                                        disabled={!selectedDepartment}
                                        required
                                    >
                                        <option value="">选择人员...</option>
                                        {filteredStaff.map((s: any) => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {transactionType === "IN" && (
                        <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)" }}>
                            <h4 style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>入库信息</h4>
                            <div>
                                <label>供应商</label>
                                <select name="handler_name" defaultValue={transaction.handler_name || ""}>
                                    <option value="">选择供应商...</option>
                                    {(suppliers as any[]).map((s: any) => (
                                        <option key={s.id} value={s.company_name}>{s.company_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label>备注</label>
                        <textarea name="note" rows={3} defaultValue={transaction.note || ""}></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={isSubmitting}>
                        {isSubmitting ? "保存中..." : "保存修改"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
