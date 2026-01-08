import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams, Form, useSubmit } from "@remix-run/react";
import { useState, useMemo } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useTheme } from "../contexts/ThemeContext";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);

    // Get URL parameters for filtering
    const url = new URL(request.url);
    const currentYearStr = new Date().getFullYear().toString();

    const year = url.searchParams.get("year") || currentYearStr;
    const month = url.searchParams.get("month") || ""; // Default to "全年"
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

    // Year filter - skip if "all" is selected
    if (year && year !== "all") {
        query += ` AND strftime('%Y', t.date) = ?`;
        bindings.push(year);

        // Month filter (only apply if year is not "all")
        if (month) {
            query += ` AND strftime('%m', t.date) = ?`;
            bindings.push(month.padStart(2, '0'));
        }
    }

    if (department) {
        query += ` AND t.department = ?`;
        bindings.push(department);
    }

    query += ` ORDER BY t.date ASC`;

    const { results: transactions } = await env.DB.prepare(query).bind(...bindings).all();

    // Get all departments for filter
    const { results: departments } = await env.DB.prepare("SELECT DISTINCT name FROM departments ORDER BY name").all();

    // Query available years from transactions
    const { results: availableYears } = await env.DB.prepare(`
        SELECT DISTINCT strftime('%Y', date) as year 
        FROM transactions 
        WHERE type = 'OUT'
        ORDER BY year DESC
    `).all();

    // If no records, at least show current year
    const years = availableYears.length > 0
        ? availableYears.map((row: any) => row.year)
        : [currentYearStr];

    // Ensure current selected year is in the list (but not 'all')
    if (year !== "all" && !years.includes(year)) {
        years.push(year);
        years.sort((a: string, b: string) => parseInt(b) - parseInt(a));
    }

    return json({ transactions, departments, user, year, month, department, years });
}

export default function Reports() {
    const { transactions, departments, user, year, month, department, years } = useLoaderData<typeof loader>();
    const { theme } = useTheme();
    const submit = useSubmit();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedCategory, setSelectedCategory] = useState("");
    const [chartView, setChartView] = useState<"line" | "bar">("line");

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString().padStart(2, '0'),
        label: `${i + 1}月`
    }));

    const handleFilterChange = (event: any) => {
        submit(event.currentTarget.form);
    };

    // Calculate statistics - only total cost
    const stats = useMemo(() => {
        const totalCost = transactions.reduce((sum: number, t: any) => {
            if (selectedCategory && t.category !== selectedCategory) return sum;
            return sum + (t.quantity * t.price);
        }, 0);

        return {
            totalCost
        };
    }, [transactions, selectedCategory]);

    // Prepare chart data - Daily usage trend with cost
    const usageTrendData = useMemo(() => {
        const dailyData: Record<string, { quantity: number; cost: number }> = {};

        transactions.forEach((t: any) => {
            if (selectedCategory && t.category !== selectedCategory) return;

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
    }, [transactions, selectedCategory]);

    // Prepare bar chart comparison data
    const comparisonData = useMemo(() => {
        if (year === "all") {
            // Year comparison mode
            const yearData: Record<string, { quantity: number; cost: number }> = {};

            transactions.forEach((t: any) => {
                if (selectedCategory && t.category !== selectedCategory) return;

                const yearStr = t.date.substring(0, 4);
                if (!yearData[yearStr]) {
                    yearData[yearStr] = { quantity: 0, cost: 0 };
                }
                yearData[yearStr].quantity += t.quantity;
                yearData[yearStr].cost += t.quantity * t.price;
            });

            return Object.entries(yearData)
                .map(([year, data]) => ({ name: `${year}年`, quantity: data.quantity, cost: data.cost }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // Month comparison mode
            const monthData: Record<string, { quantity: number; cost: number }> = {};

            transactions.forEach((t: any) => {
                if (selectedCategory && t.category !== selectedCategory) return;

                const monthStr = t.date.substring(5, 7);
                if (!monthData[monthStr]) {
                    monthData[monthStr] = { quantity: 0, cost: 0 };
                }
                monthData[monthStr].quantity += t.quantity;
                monthData[monthStr].cost += t.quantity * t.price;
            });

            return Object.entries(monthData)
                .map(([month, data]) => ({ name: `${parseInt(month)}月`, quantity: data.quantity, cost: data.cost }))
                .sort((a, b) => parseInt(a.name) - parseInt(b.name));
        }
    }, [transactions, selectedCategory, year]);

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

    // Gradient colors for cost ranking (Red -> Orange -> Yellow -> Green -> Blue)
    const COST_GRADIENT = [
        "#ef4444", // Red (Highest)
        "#f97316", // Orange
        "#f59e0b", // Amber
        "#eab308", // Yellow
        "#84cc16", // Lime
        "#22c55e", // Green
        "#10b981", // Emerald
        "#06b6d4", // Cyan
        "#3b82f6", // Blue
        "#6366f1"  // Indigo (Lowest)
    ];

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <img className="theme-icon" src="/icons/reports.svg" alt="" style={{ width: "32px", height: "32px" }} />
                    <div>
                        <h2 style={{ margin: 0 }}>报表分析</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>商品使用统计与趋势分析</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <img className="theme-icon" src="/icons/filter.svg" alt="" style={{ width: "20px", height: "20px" }} />
                            <h3 style={{ fontSize: "1.125rem", margin: 0 }}>筛选条件</h3>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>总成本:</span>
                            <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--text-accent)" }}>¥{stats.totalCost.toFixed(2)}</span>
                        </div>
                    </div>
                    <Form method="get" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
                        {/* Year Filter */}
                        <div>
                            <label>年份</label>
                            <select name="year" defaultValue={year} onChange={handleFilterChange}>
                                <option value="all">全部</option>
                                {years.map((y: string) => <option key={y} value={y}>{y}年</option>)}
                            </select>
                        </div>

                        {/* Month Filter */}
                        <div>
                            <label>月份</label>
                            <select
                                name="month"
                                defaultValue={month}
                                onChange={handleFilterChange}
                                disabled={year === "all"}
                                style={{ opacity: year === "all" ? 0.5 : 1, cursor: year === "all" ? "not-allowed" : "pointer" }}
                            >
                                <option value="">全年</option>
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>

                        {/* Department Filter */}
                        <div>
                            <label>部门</label>
                            <select name="department" defaultValue={department} onChange={handleFilterChange}>
                                <option value="">全部部门</option>
                                {departments.map((d: any) => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </Form>
                </div>

                {/* Charts */}
                {transactions.length > 0 ? (
                    <>
                        {/* Usage Trend */}
                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <img className="theme-icon" src="/icons/trend.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                    <h3 style={{ fontSize: "1.125rem", margin: 0 }}>使用趋势</h3>
                                </div>
                                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                                    {/* Chart View Toggle */}
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <button
                                            onClick={() => setChartView("line")}
                                            style={{
                                                padding: "0.375rem 0.75rem",
                                                fontSize: "0.875rem",
                                                background: chartView === "line" ? "var(--primary-gradient)" : "var(--bg-secondary)",
                                                color: chartView === "line" ? "white" : "var(--text-primary)",
                                                border: "1px solid var(--border-light)",
                                                borderRadius: "var(--radius-sm)",
                                                cursor: "pointer"
                                            }}
                                        >
                                            折线图
                                        </button>
                                        <button
                                            onClick={() => setChartView("bar")}
                                            style={{
                                                padding: "0.375rem 0.75rem",
                                                fontSize: "0.875rem",
                                                background: chartView === "bar" ? "var(--primary-gradient)" : "var(--bg-secondary)",
                                                color: chartView === "bar" ? "white" : "var(--text-primary)",
                                                border: "1px solid var(--border-light)",
                                                borderRadius: "var(--radius-sm)",
                                                cursor: "pointer"
                                            }}
                                        >
                                            柱状图
                                        </button>
                                    </div>
                                    {/* Category Selector */}
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)", whiteSpace: "nowrap", display: "inline-block", lineHeight: "1.5" }}>选择分类:</label>
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
                            </div>
                            <ResponsiveContainer width="100%" height={270}>
                                {chartView === "line" ? (
                                    <LineChart data={usageTrendData}>
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
                                        <Legend wrapperStyle={{ color: theme.colors.textPrimary }} />
                                        <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#38bdf8" strokeWidth={2} name="使用量" />
                                        <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#22c55e" strokeWidth={2} name="成本" />
                                    </LineChart>
                                ) : (
                                    <BarChart data={comparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                        <XAxis dataKey="name" stroke="var(--text-secondary)" />
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
                                        <Legend wrapperStyle={{ color: theme.colors.textPrimary }} />
                                        <Bar yAxisId="left" dataKey="quantity" name="使用量" fill="#38bdf8">
                                            {comparisonData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                        <Bar yAxisId="right" dataKey="cost" name="成本" fill="#22c55e">
                                            {comparisonData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COST_GRADIENT[index % COST_GRADIENT.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>

                        {/* Department Cost Comparison & Product Ranking */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1rem" }}>
                            {/* Department Cost Comparison */}
                            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                    <img className="theme-icon" src="/icons/bar-chart.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                    <h3 style={{ fontSize: "1.125rem", margin: 0 }}>
                                        部门成本对比 {selectedCategory && <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: "normal" }}>({selectedCategory})</span>}
                                    </h3>
                                </div>
                                <ResponsiveContainer width="100%" height={270}>
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
                                        <Bar dataKey="cost" name="总成本">
                                            {departmentCostData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COST_GRADIENT[index % COST_GRADIENT.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Product Ranking */}
                            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                    <img className="theme-icon" src="/icons/bar-chart.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                    <h3 style={{ fontSize: "1.125rem", margin: 0 }}>
                                        商品使用排行 (Top 10) {selectedCategory && <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: "normal" }}>({selectedCategory})</span>}
                                    </h3>
                                </div>
                                <ResponsiveContainer width="100%" height={270}>
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
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                <img className="theme-icon" src="/icons/table.svg" alt="" style={{ width: "20px", height: "20px" }} />
                                <h3 style={{ fontSize: "1.125rem", margin: 0 }}>详细数据</h3>
                            </div>
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
