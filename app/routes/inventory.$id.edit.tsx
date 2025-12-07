import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, Link, useActionData } from "@remix-run/react";
import { useState } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    const { results: products } = await env.DB.prepare(
        "SELECT * FROM products WHERE id = ?"
    ).bind(params.id).all();

    if (!products || products.length === 0) {
        throw new Response("Product not found", { status: 404 });
    }

    const { results: categories } = await env.DB.prepare(
        "SELECT * FROM categories ORDER BY name"
    ).all();

    return json({ product: products[0], categories, user });
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const confirmation = formData.get("confirmation");
        const { results: products } = await env.DB.prepare(
            "SELECT brand, model FROM products WHERE id = ?"
        ).bind(params.id).all();

        if (!products || products.length === 0) {
            return json({ error: "商品不存在" }, { status: 404 });
        }

        const product = products[0] as any;
        const expectedConfirmation = `${product.brand}/${product.model}`;

        if (confirmation !== expectedConfirmation) {
            return json({
                error: `确认失败。请输入: ${expectedConfirmation}`
            }, { status: 400 });
        }

        // Cascade delete: delete transactions first
        await env.DB.prepare(
            "DELETE FROM transactions WHERE product_id = ?"
        ).bind(params.id).run();

        // Then delete the product
        await env.DB.prepare(
            "DELETE FROM products WHERE id = ?"
        ).bind(params.id).run();

        return redirect("/inventory");
    }

    // Update product
    const category_id = formData.get("category_id");
    const brand = formData.get("brand");
    const model = formData.get("model");
    const price = parseFloat(formData.get("price") as string) || 0;
    const supplier = formData.get("supplier");

    if (!category_id || !model) {
        return json({ error: "分类和型号必填" }, { status: 400 });
    }

    await env.DB.prepare(
        "UPDATE products SET category_id = ?, brand = ?, model = ?, price = ?, supplier = ? WHERE id = ?"
    ).bind(category_id, brand, model, price, supplier, params.id).run();

    return redirect("/inventory");
}

export default function EditInventory() {
    const { product, categories, user } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const expectedConfirmation = `${product.brand}/${product.model}`;

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>编辑商品</h2>
                    <Link to="/inventory" style={{ color: "var(--text-secondary)" }}>返回</Link>
                </div>

                {actionData?.error && (
                    <div style={{
                        padding: "0.75rem",
                        marginBottom: "1rem",
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "var(--radius-sm)",
                        color: "#fca5a5",
                        fontSize: "0.875rem"
                    }}>
                        {actionData.error}
                    </div>
                )}

                <Form method="post" style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label>分类</label>
                        <input type="hidden" name="category_id" value={product.category_id} />
                        <input
                            type="text"
                            value={categories.find((c: any) => c.id === product.category_id)?.name || "未知分类"}
                            disabled
                            style={{ background: "var(--bg-secondary)", cursor: "not-allowed" }}
                        />
                        <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>分类不可修改</small>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>品牌</label>
                            <input type="text" name="brand" defaultValue={product.brand || ""} placeholder="例如: HP" />
                        </div>
                        <div>
                            <label>型号</label>
                            <input type="text" name="model" defaultValue={product.model} placeholder="例如: 1020 Plus" required />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label>价格 (¥)</label>
                            <input type="number" step="0.01" name="price" defaultValue={product.price || ""} placeholder="0.00" />
                        </div>
                        <div>
                            <label>当前库存</label>
                            <input type="number" value={product.stock_quantity} disabled style={{ background: "var(--bg-secondary)", cursor: "not-allowed" }} />
                            <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>库存通过入库/出库调整</small>
                        </div>
                    </div>

                    <div>
                        <label>备注</label>
                        <input type="text" name="supplier" defaultValue={product.supplier || ""} placeholder="选填" />
                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--danger-color)",
                                fontSize: "0.875rem",
                                cursor: "pointer",
                                padding: 0
                            }}
                        >
                            删除
                        </button>
                        <div style={{ flex: 1 }} />
                        <Link to="/inventory" className="btn btn-secondary">
                            取消
                        </Link>
                        <button type="submit" name="intent" value="update" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? "保存中..." : "保存"}
                        </button>
                    </div>
                </Form>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000
                    }}>
                        <div className="glass-panel" style={{ padding: "2rem", maxWidth: "500px", width: "90%" }}>
                            <h3 style={{ marginBottom: "1rem", color: "var(--danger-color)" }}>确认删除</h3>
                            <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                                删除商品将同时删除所有相关的入库和出库记录。此操作不可撤销！
                            </p>
                            <p style={{ marginBottom: "1rem" }}>
                                请输入 <strong>{expectedConfirmation}</strong> 以确认删除：
                            </p>
                            <Form method="post">
                                <input type="hidden" name="intent" value="delete" />
                                <input
                                    type="text"
                                    name="confirmation"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder={expectedConfirmation}
                                    autoFocus
                                    style={{ marginBottom: "1rem" }}
                                />
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeleteConfirmation("");
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn"
                                        style={{
                                            background: "var(--danger-color)",
                                            color: "white"
                                        }}
                                        disabled={deleteConfirmation !== expectedConfirmation}
                                    >
                                        确认删除
                                    </button>
                                </div>
                            </Form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
