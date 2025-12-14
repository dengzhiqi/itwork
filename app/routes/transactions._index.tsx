import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const type = url.searchParams.get("type"); // "IN" or "OUT" (or null for all)

    // Get current year and month for defaults
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // Get filter parameters with defaults
    const year = url.searchParams.get("year") || currentYear.toString();
    // Only set default month if month parameter is not present AND type is OUT
    // If month parameter exists but is empty, keep it empty (for "全年")
    const monthParam = url.searchParams.get("month");
    const month = monthParam !== null ? monthParam : (type === "OUT" ? currentMonth : "");
    const categoryId = url.searchParams.get("category") || "";
    const nameQuery = url.searchParams.get("name") || "";

    // Pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "15");

    let query = `
    SELECT t.*, p.brand, p.model, c.name as category_name 
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    `;

    // Add filtering based on type and filters
    const filters = [];
    const params: any[] = [];

    if (type === "IN") {
        filters.push("t.type = 'IN'");
    } else if (type === "OUT") {
        filters.push("t.type = 'OUT'");
    }

    // Year filter - skip if "all" is selected
    if (year && year !== "all") {
        filters.push("strftime('%Y', t.date) = ?");
        params.push(year);
    }

    // Month filter (optional) - only apply if year is not "all"
    if (month && year !== "all") {
        filters.push("strftime('%m', t.date) = ?");
        params.push(month.padStart(2, '0'));
    }

    // Category filter (optional)
    if (categoryId) {
        filters.push("p.category_id = ?");
        params.push(categoryId);
    }

    // Name filter (optional) - search in handler_name
    if (nameQuery) {
        filters.push("t.handler_name LIKE ?");
        params.push(`%${nameQuery}%`);
    }

    const whereClause = filters.length > 0 ? " WHERE " + filters.join(" AND ") : "";

    // Count total records
    let countQuery = `
        SELECT COUNT(*) as total
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        ${whereClause}
    `;
    const { total } = await env.DB.prepare(countQuery).bind(...params).first() as { total: number };

    // Add pagination to main query
    query += whereClause;
    query += ` ORDER BY t.date DESC, t.id DESC`;

    const offset = (page - 1) * pageSize;
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const { results: transactions } = await env.DB.prepare(query).bind(...params).all();

    // Load categories for filter
    const { results: categories } = await env.DB.prepare(
        "SELECT id, name FROM categories ORDER BY name"
    ).all();

    // Query available years from transactions (filtered by type if applicable)
    let yearQuery = `
        SELECT DISTINCT strftime('%Y', date) as year 
        FROM transactions
    `;
    const yearParams: any[] = [];

    if (type === "IN") {
        yearQuery += " WHERE type = 'IN'";
    } else if (type === "OUT") {
        yearQuery += " WHERE type = 'OUT'";
    }

    yearQuery += " ORDER BY year DESC";

    const { results: availableYears } = await env.DB.prepare(yearQuery).bind(...yearParams).all();

    // If no records, at least show current year
    const years = availableYears.length > 0
        ? availableYears.map((row: any) => row.year)
        : [currentYear.toString()];

    // Ensure current selected year is in the list (but not 'all')
    if (year !== "all" && !years.includes(year)) {
        years.push(year);
        years.sort((a: string, b: string) => parseInt(b) - parseInt(a));
    }

    return json({
        transactions,
        user,
        type,
        categories,
        year,
        month,
        categoryId,
        nameQuery,
        years,
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        }
    });
}

export default function Transactions() {
    const { transactions, user, type, categories, year, month, categoryId, nameQuery, years, pagination } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentType = searchParams.get("type") || type;

    const pageTitle = currentType === "IN" ? "入库管理" : (currentType === "OUT" ? "出库管理" : "出入库记录");

    // Generate month options
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString().padStart(2, '0'),
        label: `${i + 1}月`
    }));

    const [nameInput, setNameInput] = useState(nameQuery);

    // Update local state when URL param changes
    useEffect(() => {
        setNameInput(nameQuery);
    }, [nameQuery]);

    const handleFilterChange = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            // For month filter, keep empty string to distinguish from "no parameter"
            // For other filters, delete the parameter
            if (key === "month") {
                newParams.set(key, "");
            } else {
                newParams.delete(key);
            }
        }
        // Reset to first page when filters change
        newParams.set("page", "1");
        setSearchParams(newParams);
    };

    const handlePageSizeChange = (newPageSize: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("pageSize", newPageSize);
        newParams.set("page", "1"); // Reset to first page
        setSearchParams(newParams);
    };

    const handlePageChange = (newPage: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("page", newPage.toString());
        setSearchParams(newParams);
    };

    const handleNameSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange("name", nameInput);
    };

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                {/* Title and action buttons row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{pageTitle}</h2>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <Link to={`/transactions/export?type=${currentType}&year=${year}&month=${month}&category=${categoryId}&name=${nameQuery}`} className="btn" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-light)", padding: "0.5rem 1rem", fontSize: "0.875rem" }} target="_blank">
                            导出查询结果
                        </Link>
                        <Link to={`/transactions/new${currentType ? `?type=${currentType}` : ""}`} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                            + 新增操作
                        </Link>
                    </div>
                </div>

                {/* Filters row */}
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>筛选：</span>

                    {/* Year filter */}
                    <select
                        value={year}
                        onChange={(e) => handleFilterChange("year", e.target.value)}
                        style={{ fontSize: "0.875rem", padding: "0.5rem", width: "100px" }}
                    >
                        {years.map((y: string) => (
                            <option key={y} value={y}>{y}年</option>
                        ))}
                        <option value="all">全部</option>
                    </select>

                    {/* Month filter */}
                    <select
                        value={month}
                        onChange={(e) => handleFilterChange("month", e.target.value)}
                        disabled={year === "all"}
                        style={{
                            fontSize: "0.875rem",
                            padding: "0.5rem",
                            width: "90px",
                            opacity: year === "all" ? 0.5 : 1,
                            cursor: year === "all" ? "not-allowed" : "pointer"
                        }}
                    >
                        <option value="">全年</option>
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    {/* Category filter */}
                    <select
                        value={categoryId}
                        onChange={(e) => handleFilterChange("category", e.target.value)}
                        style={{ fontSize: "0.875rem", padding: "0.5rem", width: "120px" }}
                    >
                        <option value="">全部分类</option>
                        {categories.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    {/* Name/Supplier search - for both IN and OUT transactions */}
                    {(currentType === "OUT" || currentType === "IN") && (
                        <>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginLeft: "1rem" }}>
                                {currentType === "IN" ? "供应商查询：" : "姓名查询："}
                            </span>
                            <form onSubmit={handleNameSearch} style={{ display: "inline-block", position: "relative" }}>
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    placeholder={currentType === "IN" ? "输入供应商" : "输入姓名"}
                                    style={{ fontSize: "0.875rem", padding: "0.5rem", paddingRight: "2rem", width: "150px" }}
                                    autoComplete="off"
                                />
                                {nameInput && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNameInput("");
                                            handleFilterChange("name", "");
                                        }}
                                        style={{
                                            position: "absolute",
                                            right: "0.5rem",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            background: "none",
                                            border: "none",
                                            color: "var(--danger-color)",
                                            cursor: "pointer",
                                            fontSize: "1rem",
                                            padding: "0",
                                            lineHeight: "1"
                                        }}
                                        title="清除"
                                    >
                                        ✕
                                    </button>
                                )}
                            </form>
                        </>
                    )}

                    {/* Page size selector */}
                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginLeft: "auto" }}>每页显示：</span>
                    <select
                        value={searchParams.get("pageSize") || "15"}
                        onChange={(e) => handlePageSizeChange(e.target.value)}
                        style={{ fontSize: "0.875rem", padding: "0.5rem", width: "80px" }}
                    >
                        <option value="15">15条</option>
                        <option value="20">20条</option>
                        <option value="30">30条</option>
                    </select>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                                <th style={{ padding: "0.6rem 0.75rem" }}>日期</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>分类</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>品牌型号</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>数量</th>

                                {(!currentType || currentType === "OUT") && (
                                    <th style={{ padding: "0.6rem 0.75rem" }}>部门/经手人</th>
                                )}

                                {(!currentType || currentType === "IN") && (
                                    <th style={{ padding: "0.6rem 0.75rem" }}>供货商</th>
                                )}

                                <th style={{ padding: "0.6rem 0.75rem" }}>备注</th>
                                <th style={{ padding: "0.6rem 0.75rem" }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t: any) => (
                                <tr key={t.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                    <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>{new Date(t.date).toLocaleDateString()}</td>

                                    <td style={{ padding: "0.6rem 0.75rem" }}>{t.category_name}</td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        <div style={{ fontWeight: 600 }}>{t.model}</div>
                                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.brand}</div>
                                    </td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>{t.quantity}</td>

                                    {(!currentType || currentType === "OUT") && (
                                        <td style={{ padding: "0.6rem 0.75rem" }}>
                                            {t.type === "OUT" ? (
                                                <div>
                                                    <div>{t.handler_name}</div>
                                                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{t.department}</div>
                                                </div>
                                            ) : "-"}
                                        </td>
                                    )}

                                    {(!currentType || currentType === "IN") && (
                                        <td style={{ padding: "0.6rem 0.75rem" }}>
                                            {t.type === "IN" ? (
                                                <div style={{ color: "var(--text-accent)" }}>{t.handler_name || "-"}</div>
                                            ) : "-"}
                                        </td>
                                    )}

                                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-secondary)" }}>{t.note || "-"}</td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        {/* Pass type to edit page for better context if needed, though id is enough */}
                                        <Link
                                            to={`/transactions/${t.id}/edit`}
                                            style={{
                                                fontSize: "0.875rem",
                                                color: "var(--text-accent)",
                                                textDecoration: "none"
                                            }}
                                        >
                                            编辑
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                        暂无记录。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination controls - only show if more than 10 records */}
                {pagination.total > 10 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "1.5rem",
                        paddingTop: "1.5rem",
                        borderTop: "1px solid var(--border-light)"
                    }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            {/* Previous button */}
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                                className="btn"
                                style={{
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.875rem",
                                    opacity: pagination.page === 1 ? 0.5 : 1,
                                    cursor: pagination.page === 1 ? "not-allowed" : "pointer"
                                }}
                            >
                                上一页
                            </button>

                            {/* Page numbers */}
                            {(() => {
                                const { page, totalPages } = pagination;
                                const pages = [];

                                // Show max 5 page numbers
                                let startPage = Math.max(1, page - 2);
                                let endPage = Math.min(totalPages, page + 2);

                                // Adjust if near start or end
                                if (page <= 3) {
                                    endPage = Math.min(5, totalPages);
                                }
                                if (page >= totalPages - 2) {
                                    startPage = Math.max(1, totalPages - 4);
                                }

                                for (let i = startPage; i <= endPage; i++) {
                                    pages.push(
                                        <button
                                            key={i}
                                            onClick={() => handlePageChange(i)}
                                            className="btn"
                                            style={{
                                                padding: "0.5rem 0.75rem",
                                                fontSize: "0.875rem",
                                                minWidth: "40px",
                                                background: i === page ? "var(--primary-color)" : "var(--bg-glass)",
                                                color: i === page ? "white" : "var(--text-primary)",
                                                border: i === page ? "1px solid var(--primary-color)" : "1px solid var(--border-light)"
                                            }}
                                        >
                                            {i}
                                        </button>
                                    );
                                }

                                return pages;
                            })()}

                            {/* Next button */}
                            <button
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                                className="btn"
                                style={{
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.875rem",
                                    opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
                                    cursor: pagination.page === pagination.totalPages ? "not-allowed" : "pointer"
                                }}
                            >
                                下一页
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
