import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState, useMemo, useEffect } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get URL parameters for filtering
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const department = url.searchParams.get("department") || "";

    // Check if price column exists in transactions table
    const { results: tableInfo } = await env.DB.prepare("PRAGMA table_info(transactions)").all();
    const hasPriceColumn = tableInfo.some((col: any) => col.name === "price");

    // Build query for OUT transactions with product details
    let query = `
        SELECT 
            t.id,
            t.date,
            t.quantity,
            ${hasPriceColumn ? 't.price' : 'p.price'} as price,
            t.department,
            p.brand,
            p.model,
            c.name as category
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE t.type = 'OUT'
    `;

    const bindings: any[] = [];

    if (startDate) {
        query += ` AND t.date >= ?`;
        bindings.push(startDate);
    }

    if (endDate) {
        query += ` AND t.date <= ?`;
        bindings.push(endDate + "T23:59:59");
    }

    if (department) {
        query += ` AND t.department = ?`;
        bindings.push(department);
    }

    query += ` ORDER BY t.date ASC`;

    const { results: transactions } = await env.DB.prepare(query).bind(...bindings).all();

    // Get all departments for filter
    const { results: departments } = await env.DB.prepare("SELECT DISTINCT name FROM departments ORDER BY name").all();

    return json({ transactions, departments, user });
}

export default function Reports() {
    const { transactions, departments, user } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filter states
    const [dateRange, setDateRange] = useState(searchParams.get("range") || "all");
    // Set default custom dates to year start and today
    const getYearStart = () => {
        const now = new Date();
        return `${now.getFullYear()}-01-01`;
    };
    const getToday = () => {
        return new Date().toISOString().split("T")[0];
    };
    const [customStartDate, setCustomStartDate] = useState(searchParams.get("startDate") || getYearStart());
    const [customEndDate, setCustomEndDate] = useState(searchParams.get("endDate") || getToday());
    const [selectedDepartment, setSelectedDepartment] = useState(searchParams.get("department") || "");
    const [selectedCategory, setSelectedCategory] = useState("");

    // Calculate date ranges
    const getDateRange = (range: string) => {
        const now = new Date();
        const today = now.toISOString().split("T")[0];

        switch (range) {
            case "month":
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { start: monthStart.toISOString().split("T")[0], end: today };
            case "year":
                const yearStart = `${now.getFullYear()}-01-01`;
                return { start: yearStart, end: today };
            case "custom":
                return { start: customStartDate, end: customEndDate };
            default:
                return { start: "", end: "" };
        }
    };

    // Apply filters
    const applyFilters = () => {
        const params = new URLSearchParams();
        params.set("range", dateRange);

        const { start, end } = getDateRange(dateRange);
        if (start) params.set("startDate", start);
        if (end) params.set("endDate", end);
        if (selectedDepartment) params.set("department", selectedDepartment);

        setSearchParams(params);
    };

    // Reset filters
    const resetFilters = () => {
        setDateRange("all");
        setCustomStartDate("");
        setCustomEndDate("");
        setSelectedDepartment("");
        setSearchParams(new URLSearchParams());
    };

    // Auto-apply filters when department changes
    useEffect(() => {
        if (selectedDepartment !== searchParams.get("department")) {
            applyFilters();
        }
    }, [selectedDepartment]);

    // Auto-apply filters when date range changes
    useEffect(() => {
        applyFilters();
    }, [dateRange, customStartDate, customEndDate]);

    // Calculate statistics - only total cost
    const stats = useMemo(() => {
        const totalCost = transactions.reduce((sum: number, t: any) => sum + (t.quantity * t.price), 0);

        return {
            totalCost
        };
    }, [transactions]);

    // Prepare chart data - Daily usage trend with cost
    const usageTrendData = useMemo(() => {
        const dailyData: Record<string, { quantity: number; cost: number }> = {};

        transactions.forEach((t: any) => {
            const date = t.date.split("T")[0];
            if (!dailyData[date]) {
                dailyData[date] = { quantity: 0, cost: 0 };
            }
            dailyData[date].quantity += t.quantity;
            dailyData[date].cost += t.quantity * t.price;
        });

        return Object.entries(dailyData)
            .map(([date, data]) => ({ date, quantity: data.quantity, cost: data.cost }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions]);

    // Department distribution by quantity
    const departmentData = useMemo(() => {
        const deptUsage: Record<string, number> = {};

        transactions.forEach((t: any) => {
            const dept = t.department || "未分配";
            deptUsage[dept] = (deptUsage[dept] || 0) + t.quantity;
        });

        return Object.entries(deptUsage).map(([name, value]) => ({ name, value }));
    }, [transactions]);

    // Department cost comparison
    const departmentCostData = useMemo(() => {
        const deptCost: Record<string, number> = {};

        transactions.forEach((t: any) => {
            if (selectedCategory && t.category !== selectedCategory) return;

            const dept = t.department || "未分配";
            deptCost[dept] = (deptCost[dept] || 0) + (t.quantity * t.price);
        });

        return Object.entries(deptCost)
            .map(([name, cost]) => ({ name, cost }))
            .sort((a, b) => b.cost - a.cost);
    }, [transactions, selectedCategory]);

    // Get unique categories for selector
    const categoryList = useMemo(() => {
        const categories = new Set<string>();
        transactions.forEach((t: any) => {
            if (t.category) {
                categories.add(t.category);
            }
        });
        return Array.from(categories).sort();
    }, [transactions]);

    // Category-specific usage trend with cost
    const categoryUsageTrendData = useMemo(() => {
        if (!selectedCategory) return [];

        const dailyData: Record<string, { quantity: number; cost: number }> = {};

        transactions.forEach((t: any) => {
            if (t.category === selectedCategory) {
                const date = t.date.split("T")[0];
                if (!dailyData[date]) {
                    dailyData[date] = { quantity: 0, cost: 0 };
                }
                dailyData[date].quantity += t.quantity;
                dailyData[date].cost += t.quantity * t.price;
            }
        });

        return Object.entries(dailyData)
            .map(([date, data]) => ({ date, quantity: data.quantity, cost: data.cost }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions, selectedCategory]);

    // Product ranking - Top 10
    const productRankingData = useMemo(() => {
        const productUsage: Record<string, { name: string; quantity: number; cost: number }> = {};

        transactions.forEach((t: any) => {
            if (selectedCategory && t.category !== selectedCategory) return;

            const key = `${t.brand} ${t.model}`;
            if (!productUsage[key]) {
                productUsage[key] = { name: key, quantity: 0, cost: 0 };
            }
            productUsage[key].quantity += t.quantity;
            productUsage[key].cost += t.quantity * t.price;
        });

        return Object.values(productUsage)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    }, [transactions, selectedCategory]);

    // Colors for charts
    const COLORS = ["#38bdf8", "#818cf8", "#f0a050", "#a78bfa", "#22c55e", "#ef4444", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"];

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                {/* Header */}
                <div>
                    <h2 style={{ marginBottom: "0.5rem" }}>报表分析</h2>
                    <p style={{ color: "var(--text-secondary)" }}>商品使用统计与趋势分析</p>
                </div>

                {/* Filters */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.125rem", margin: 0 }}>筛选条件</h3>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>总成本:</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--text-accent)" }}>¥{stats.totalCost.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                        {/* Date Range */}
                        <div>
                            <label>时间范围</label>
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                                <option value="all">全部时间</option>
                                <option value="month">本月</option>
                                <option value="year">本年</option>
                                <option value="custom">自定义</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {dateRange === "custom" && (
                            <>
                                <div>
                                    <label>开始日期</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label>结束日期</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Department Filter */}
                        <div>
                            <label>部门</label>
                            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                                <option value="">全部部门</option>
                                {departments.map((d: any) => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>



                {/* Charts */}
                {transactions.length > 0 ? (
                    <>
                        {/* Usage Trend */}
                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "nowrap", gap: "1rem" }}>
                                <h3 style={{ fontSize: "1.125rem", margin: 0, flexShrink: 0 }}>使用趋势</h3>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>选择分类:</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem", minWidth: "120px" }}
                                    >
                                        <option value="">全部分类</option>
                                        {categoryList.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={selectedCategory ? categoryUsageTrendData : usageTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                                    <YAxis yAxisId="left" stroke="var(--text-secondary)" />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--bg-panel)",
                                            border: "1px solid var(--border-light)",
                                            borderRadius: "var(--radius-sm)",
                                            color: "var(--text-primary)"
                                        }}
                                        formatter={(value: number, name: string) => {
                                            if (name === "成本") return `¥${value.toFixed(2)}`;
                                            return value;
                                        }}
                                    />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#38bdf8" strokeWidth={2} name="使用量" />
                                    <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#22c55e" strokeWidth={2} name="成本" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Department Cost Comparison & Product Ranking */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1rem" }}>
                            {/* Department Cost Comparison */}
                            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                                <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
                                    部门成本对比 {selectedCategory && <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: "normal" }}>({selectedCategory})</span>}
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={departmentCostData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                        <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                        <YAxis stroke="var(--text-secondary)" />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--bg-panel)",
                                                border: "1px solid var(--border-light)",
                                                borderRadius: "var(--radius-sm)",
                                                color: "var(--text-primary)"
                                            }}
                                            formatter={(value: number) => `¥${value.toFixed(2)}`}
                                        />
                                        <Bar dataKey="cost" fill="#22c55e" name="总成本" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Product Ranking */}
                            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                                <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
                                    商品使用排行 (Top 10) {selectedCategory && <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: "normal" }}>({selectedCategory})</span>}
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={productRankingData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                        <XAxis type="number" stroke="var(--text-secondary)" />
                                        <YAxis dataKey="name" type="category" width={150} stroke="var(--text-secondary)" />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--bg-panel)",
                                                border: "1px solid var(--border-light)",
                                                borderRadius: "var(--radius-sm)",
                                                color: "var(--text-primary)"
                                            }}
                                        />
                                        <Bar dataKey="quantity" fill="#818cf8" name="使用量" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>详细数据</h3>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "2px solid var(--border-light)", textAlign: "left" }}>
                                            <th style={{ padding: "1rem" }}>商品</th>
                                            <th style={{ padding: "1rem" }}>分类</th>
                                            <th style={{ padding: "1rem", textAlign: "right" }}>总使用量</th>
                                            <th style={{ padding: "1rem", textAlign: "right" }}>总成本</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productRankingData.map((product, index) => (
                                            <tr key={index} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                                <td style={{ padding: "1rem", fontWeight: 600 }}>{product.name}</td>
                                                <td style={{ padding: "1rem" }}>-</td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>{product.quantity}</td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>¥{product.cost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: "1.125rem" }}>
                            暂无数据。请调整筛选条件或添加出库记录。
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
