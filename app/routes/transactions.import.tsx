import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "OUT";

    // Load all categories for auto-creation dropdown
    const { results: categories } = await env.DB.prepare(
        "SELECT id, name FROM categories ORDER BY name"
    ).all();

    return json({ user, type, categories });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    await requireUser(request, env);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || file.size === 0) {
        return json({ error: "请选择文件" }, { status: 400 });
    }

    try {
        // Check UTF-8 encoding
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        let text;
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            text = decoder.decode(bytes);
        } catch (e) {
            return json({ error: "文件编码不是UTF-8，请将CSV文件转换为UTF-8编码后再上传" }, { status: 400 });
        }

        // Load all products and categories for matching
        const { results: products } = await env.DB.prepare(
            "SELECT id, brand, model, category_id FROM products"
        ).all();

        const { results: categories } = await env.DB.prepare(
            "SELECT id, name FROM categories"
        ).all();

        const productMap = new Map();
        products.forEach((p: any) => {
            const key = `${p.brand?.trim().toLowerCase()}|${p.model?.trim().toLowerCase()}`;
            productMap.set(key, p);
        });

        const categoryMap = new Map();
        categories.forEach((c: any) => {
            categoryMap.set(c.name.trim().toLowerCase(), c.id);
        });

        const lines = text.split(/\r?\n/);

        // Skip header
        const startIndex = 1;

        let successCount = 0;
        const errors: string[] = [];
        const batch: any[] = [];
        const newProducts: any[] = [];
        const newCategories: Set<string> = new Set();

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const lineNumber = i + 1;
            const parts = line.split(/,|，/);  // Support both English and Chinese commas

            try {
                if (type === "OUT") {
                    // OUT format: 日期,分类,品牌,型号,数量,部门,经手人,备注
                    if (parts.length < 7) {
                        errors.push(`行 ${lineNumber}: 列数不足，需要至少7列`);
                        continue;
                    }

                    const dateStr = parts[0].trim();
                    const categoryName = parts[1].trim();
                    const brand = parts[2].trim();
                    const model = parts[3].trim();
                    const quantityStr = parts[4].trim();
                    const department = parts[5].trim();
                    const handlerName = parts[6].trim();
                    const note = parts.length > 7 ? parts[7].trim() : "";

                    // Validate date
                    const date = dateStr.replace(/\//g, '-');
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        errors.push(`行 ${lineNumber}: 日期格式错误，应为 YYYY-MM-DD 或 YYYY/MM/DD`);
                        continue;
                    }

                    // Validate quantity
                    const quantity = parseInt(quantityStr);
                    if (isNaN(quantity) || quantity <= 0) {
                        errors.push(`行 ${lineNumber}: 数量必须是正整数`);
                        continue;
                    }

                    // Get or create category
                    let catId = categoryMap.get(categoryName.toLowerCase());
                    if (!catId) {
                        newCategories.add(categoryName);
                        catId = `temp_${categoryName}`; // Placeholder, will be replaced after category creation
                    }

                    // Match product
                    const productKey = `${brand.toLowerCase()}|${model.toLowerCase()}`;
                    let product = productMap.get(productKey);

                    if (!product) {
                        // Create new product
                        const newProduct = {
                            brand,
                            model,
                            category_name: categoryName,
                            category_id: catId,
                            tempKey: productKey
                        };
                        newProducts.push(newProduct);
                    }

                    // Transaction will be created after products are inserted
                    batch.push({
                        type: "OUT",
                        productKey,
                        quantity,
                        department,
                        handlerName,
                        date,
                        note
                    });

                } else {
                    // IN format: 日期,分类,品牌,型号,数量,单价,供应商,备注
                    if (parts.length < 7) {
                        errors.push(`行 ${lineNumber}: 列数不足，需要至少7列`);
                        continue;
                    }

                    const dateStr = parts[0].trim();
                    const categoryName = parts[1].trim();
                    const brand = parts[2].trim();
                    const model = parts[3].trim();
                    const quantityStr = parts[4].trim();
                    const priceStr = parts[5].trim();
                    const supplier = parts[6].trim();
                    const note = parts.length > 7 ? parts[7].trim() : "";

                    // Validate date
                    const date = dateStr.replace(/\//g, '-');
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        errors.push(`行 ${lineNumber}: 日期格式错误，应为 YYYY-MM-DD 或 YYYY/MM/DD`);
                        continue;
                    }

                    // Validate quantity
                    const quantity = parseInt(quantityStr);
                    if (isNaN(quantity) || quantity <= 0) {
                        errors.push(`行 ${lineNumber}: 数量必须是正整数`);
                        continue;
                    }

                    // Validate price
                    const price = parseFloat(priceStr);
                    if (isNaN(price) || price < 0) {
                        errors.push(`行 ${lineNumber}: 单价格式错误`);
                        continue;
                    }

                    // Get or create category
                    let catId = categoryMap.get(categoryName.toLowerCase());
                    if (!catId) {
                        newCategories.add(categoryName);
                        catId = `temp_${categoryName}`; // Placeholder
                    }

                    // Match product
                    const productKey = `${brand.toLowerCase()}|${model.toLowerCase()}`;
                    let product = productMap.get(productKey);

                    if (!product) {
                        const newProduct = {
                            brand,
                            model,
                            category_name: categoryName,
                            category_id: catId,
                            price,
                            tempKey: productKey
                        };
                        newProducts.push(newProduct);
                    }

                    batch.push({
                        type: "IN",
                        productKey,
                        quantity,
                        price,
                        handlerName: supplier,
                        date,
                        note
                    });
                }

            } catch (e: any) {
                errors.push(`行 ${lineNumber}: ${e.message || '解析错误'}`);
            }
        }

        // Create new categories first
        const createdCategoryMap = new Map();
        if (newCategories.size > 0) {
            for (const catName of newCategories) {
                // Generate slug
                let slug = catName.toLowerCase()
                    .replace(/[\u4e00-\u9fa5]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]/g, '');

                if (!slug) {
                    slug = `category-${Date.now()}`;
                }

                const result = await env.DB.prepare(
                    "INSERT INTO categories (name, slug) VALUES (?, ?)"
                ).bind(catName, slug).run();

                const newCatId = result.meta.last_row_id;
                createdCategoryMap.set(catName.toLowerCase(), newCatId);
                categoryMap.set(catName.toLowerCase(), newCatId);
            }
        }

        // Create new products
        const createdProductMap = new Map();
        if (newProducts.length > 0) {
            for (const np of newProducts) {
                // Resolve category ID
                const finalCatId = categoryMap.get(np.category_name.toLowerCase());

                const result = await env.DB.prepare(
                    "INSERT INTO products (category_id, brand, model, price, stock_quantity) VALUES (?, ?, ?, ?, 0)"
                ).bind(finalCatId, np.brand, np.model, np.price || 0).run();

                createdProductMap.set(np.tempKey, { id: result.meta.last_row_id });
            }
        }

        // Now insert transactions
        if (batch.length > 0) {
            const transactionStmts = [];
            const stockUpdateStmts = [];

            for (const item of batch) {
                let product = productMap.get(item.productKey) || createdProductMap.get(item.productKey);

                if (!product) continue;  // Should not happen but safeguard

                const productId = product.id;

                // Insert transaction
                if (item.type === "OUT") {
                    transactionStmts.push(
                        env.DB.prepare(
                            "INSERT INTO transactions (product_id, type, quantity, price, department, handler_name, date, note) VALUES (?, ?, ?, 0, ?, ?, ?, ?)"
                        ).bind(productId, "OUT", item.quantity, item.department, item.handlerName, item.date, item.note)
                    );

                    // Update stock
                    stockUpdateStmts.push(
                        env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?")
                            .bind(item.quantity, productId)
                    );
                } else {
                    transactionStmts.push(
                        env.DB.prepare(
                            "INSERT INTO transactions (product_id, type, quantity, price, handler_name, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
                        ).bind(productId, "IN", item.quantity, item.price, item.handlerName, item.date, item.note)
                    );

                    // Update stock
                    stockUpdateStmts.push(
                        env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
                            .bind(item.quantity, productId)
                    );
                }
            }

            // Execute in batches of 50
            const chunkSize = 50;
            for (let i = 0; i < transactionStmts.length; i += chunkSize) {
                await env.DB.batch(transactionStmts.slice(i, i + chunkSize));
            }
            for (let i = 0; i < stockUpdateStmts.length; i += chunkSize) {
                await env.DB.batch(stockUpdateStmts.slice(i, i + chunkSize));
            }

            successCount = batch.length;
        }

        return json({
            success: true,
            count: successCount,
            newCategoriesCount: newCategories.size,
            newProductsCount: newProducts.length,
            errors: errors.length > 0 ? errors : null
        });

    } catch (e) {
        console.error(e);
        return json({ error: `导入失败: ${e.message || '未知错误'}` }, { status: 500 });
    }
}

// CSV template generator
function generateCSVTemplate(type: string): string {
    if (type === "OUT") {
        return "日期,分类,品牌,型号,数量,部门,经手人,备注\n2024-01-15,Storage Devices,Kingston,USB 3.0 32GB,10,技术部,张三,批量采购\n2024-02-20,Storage Devices,SanDisk,移动硬盘1TB,5,市场部,李四,";
    } else {
        return "日期,分类,品牌,型号,数量,单价,供应商,备注\n2024-01-10,Storage Devices,Kingston,USB 3.0 32GB,100,45.50,京东,年度采购\n2024-02-15,Storage Devices,SanDisk,移动硬盘1TB,50,320.00,天猫,季度采购";
    }
}

export default function TransactionImport() {
    const { user, type, categories } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const [searchParams] = useSearchParams();
    const currentType = searchParams.get("type") || type;



    const handleDownloadTemplate = () => {
        const template = generateCSVTemplate(currentType);
        const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentType === "OUT" ? "出库" : "入库"}记录模板.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h2>导入{currentType === "OUT" ? "出库" : "入库"}记录</h2>
                    <Link to="/settings?tab=data" style={{ color: "var(--text-secondary)" }}>返回设置</Link>
                </div>

                {/* Template Download */}
                <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                    <h4 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--text-primary)" }}>📝 CSV 格式要求</h4>
                    <p style={{ fontSize: "0.875rem", marginBottom: "1rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                        {currentType === "OUT"
                            ? "每行包含：日期、分类、品牌、型号、数量、部门、经手人、备注（可选）"
                            : "每行包含：日期、分类、品牌、型号、数量、单价、供应商、备注（可选）"
                        }
                    </p>
                    <button
                        onClick={handleDownloadTemplate}
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                    >
                        下载 CSV 模板
                    </button>
                </div>

                {/* Success Message */}
                {actionData?.success && (
                    <div style={{ padding: "1rem", background: "rgba(34, 197, 94, 0.1)", color: "#86efac", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                        ✅ 成功导入 {actionData.count} 条记录
                        {actionData.newCategoriesCount > 0 && ` (新建了 ${actionData.newCategoriesCount} 个分类)`}
                        {actionData.newProductsCount > 0 && ` (新建了 ${actionData.newProductsCount} 个产品)`}
                        {actionData.errors && (
                            <details style={{ marginTop: "0.5rem" }}>
                                <summary style={{ cursor: "pointer", fontSize: "0.875rem" }}>
                                    有 {actionData.errors.length} 行出现错误 (点击查看)
                                </summary>
                                <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem", fontSize: "0.875rem" }}>
                                    {actionData.errors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {actionData?.error && (
                    <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                        ❌ {actionData.error}
                    </div>
                )}

                {/* Import Form */}
                <Form method="post" encType="multipart/form-data" style={{ display: "grid", gap: "1.5rem" }}>
                    <input type="hidden" name="type" value={currentType} />

                    <div>
                        <label>选择 CSV 文件</label>
                        <input
                            type="file"
                            name="file"
                            accept=".csv"
                            required
                            style={{
                                padding: "1rem",
                                border: "1px dashed var(--border-light)",
                                borderRadius: "var(--radius-sm)",
                                width: "100%",
                                cursor: "pointer"
                            }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "正在导入..." : "导入"}
                    </button>
                </Form>
            </div>
        </Layout>
    );
}
