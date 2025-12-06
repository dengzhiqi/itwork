import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    const { results: products } = await env.DB.prepare(`
    SELECT p.id, p.brand, p.model, p.stock_quantity, c.name as category 
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY c.name, p.brand
  `).all();

    const { results: staff } = await env.DB.prepare("SELECT * FROM staff ORDER BY department, name").all();
    const { results: suppliers } = await env.DB.prepare("SELECT * FROM suppliers ORDER BY company_name").all();
    // Fetch departments
    const { results: departments } = await env.DB.prepare("SELECT name FROM departments ORDER BY name ASC").all();

    return json({ products, staff, suppliers, departments, user });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const type = formData.get("type");
    const product_id = formData.get("product_id");
    const quantity = parseInt(formData.get("quantity") as string);
    const date = formData.get("date");
    const department = formData.get("department");
    // handler_name will store Staff Name for OUT, and Supplier Name for IN
    const handler_name = formData.get("handler_name");
    const note = formData.get("note");

    if (!product_id || !quantity || !type) {
        return json({ error: "缺少必填字段" }, { status: 400 });
    }

    if (type === "OUT") {
        const { results } = await env.DB.prepare("SELECT stock_quantity FROM products WHERE id = ?").bind(product_id).all();
        const currentStock = results[0]?.stock_quantity || 0;
        if (currentStock < quantity) {
            return json({ error: `库存不足 (当前: ${currentStock})` }, { status: 400 });
        }

        await env.DB.batch([
            env.DB.prepare("INSERT INTO transactions (product_id, type, quantity, department, handler_name, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(product_id, type, quantity, department, handler_name, date || new Date().toISOString(), note),
            env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?").bind(quantity, product_id)
        ]);
    } else {
        // IN: Store supplier name in handler_name if provided
        await env.DB.batch([
            env.DB.prepare("INSERT INTO transactions (product_id, type, quantity, handler_name, date, note) VALUES (?, ?, ?, ?, ?, ?)").bind(product_id, type, quantity, handler_name, date || new Date().toISOString(), note),
            env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?").bind(quantity, product_id)
        ]);
    }

    return redirect(`/transactions?type=${type}`);
}

export default function NewTransaction() {
    const { products, staff, suppliers, departments: loadedDepartments, user } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const [searchParams] = useSearchParams();
    const initialType = searchParams.get("type") || "OUT";

    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [transactionType, setTransactionType] = useState(initialType);
    const [filteredStaff, setFilteredStaff] = useState<any[]>([]);

    const departments = (loadedDepartments as any[]).map(d => d.name);

    useEffect(() => {
        if (selectedDepartment) {
            const filtered = (staff as any[]).filter(s => s.department === selectedDepartment);
            setFilteredStaff(filtered);
        } else {
            setFilteredStaff([]);
        }
    }, [selectedDepartment, staff]);

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>记录{transactionType === "OUT" ? "出库" : "入库"}</h2>
                    <Link to={`/transactions?type=${transactionType}`} style={{ color: "var(--text-secondary)" }}>取消</Link>
                </div>

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>类型</label>
                            <select
                                name="type"
                                value={transactionType}
                                onChange={(e) => setTransactionType(e.target.value)}
                                required
                            >
                                <option value="OUT">出库 (使用)</option>
                                <option value="IN">入库 (补货)</option>
                            </select>
                        </div>
                        <div>
                            <label>日期</label>
                            <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>
                    </div>

                    <div>
                        <label>产品</label>
                        <select name="product_id" required style={{ fontFamily: "monospace" }}>
                            <option value="">选择商品...</option>
                            {(products as any[]).map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    [{p.category}] {p.brand} {p.model} (库存: {p.stock_quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>数量</label>
                        <input type="number" name="quantity" min="1" defaultValue="1" required />
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
                                    <select name="handler_name" disabled={!selectedDepartment} required>
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
                                <select name="handler_name">
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
                        <textarea name="note" rows={3}></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={isSubmitting}>
                        {isSubmitting ? "处理中..." : "确认操作"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
