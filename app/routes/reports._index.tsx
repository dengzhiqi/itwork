import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { useState, useMemo } from "react";
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
    const [customStartDate, setCustomStartDate] = useState(searchParams.get("startDate") || "");
    const [customEndDate, setCustomEndDate] = useState(searchParams.get("endDate") || "");
    const [selectedDepartment, setSelectedDepartment] = useState(searchParams.get("department") || "");

    // Calculate date ranges
    const getDateRange = (range: string) => {
        const now = new Date();
        const today = now.toISOString().split("T")[0];

        switch (range) {
            case "7days":
                const week = new Date(now);
                week.setDate(week.getDate() - 7);
                return { start: week.toISOString().split("T")[0], end: today };
            case "30days":
                const month = new Date(now);
                month.setDate(month.getDate() - 30);
                return { start: month.toISOString().split("T")[0], end: today };
            case "90days":
                const quarter = new Date(now);
                quarter.setDate(quarter.getDate() - 90);
                return { start: quarter.toISOString().split("T")[0], end: today };
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

    // Calculate statistics
    const stats = useMemo(() => {
        const totalQuantity = transactions.reduce((sum: number, t: any) => sum + t.quantity, 0);
        const totalCost = transactions.reduce((sum: number, t: any) => sum + (t.quantity * t.price), 0);
        const transactionCount = transactions.length;

        // Find most used product
        const productUsage: Record<string, { quantity: number; name: string }> = {};
        transactions.forEach((t: any) => {
            const key = `${t.brand} ${t.model}`;
            if (!productUsage[key]) {
                productUsage[key] = { quantity: 0, name: key };
            }
            productUsage[key].quantity += t.quantity;
        });

        const mostUsed = Object.values(productUsage).sort((a, b) => b.quantity - a.quantity)[0];

        return {
            totalQuantity,
            totalCost,
            transactionCount,
            mostUsedProduct: mostUsed?.name || "无",
            mostUsedQuantity: mostUsed?.quantity || 0
        };
    }, [transactions]);

    // Prepare chart data - Daily usage trend
    const usageTrendData = useMemo(() => {
        const dailyData: Record<string, number> = {};

        transactions.forEach((t: any) => {
            const date = t.date.split("T")[0];
            dailyData[date] = (dailyData[date] || 0) + t.quantity;
        });

        return Object.entries(dailyData)
            .map(([date, quantity]) => ({ date, quantity }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions]);

    // Department distribution
    const departmentData = useMemo(() => {
        const deptUsage: Record<string, number> = {};

        transactions.forEach((t: any) => {
            const dept = t.department || "未分配";
            deptUsage[dept] = (deptUsage[dept] || 0) + t.quantity;
        });

        return Object.entries(deptUsage).map(([name, value]) => ({ name, value }));
    }, [transactions]);

    // Product ranking - Top 10
    const productRankingData = useMemo(() => {
        const productUsage: Record<string, { name: string; quantity: number; cost: number }> = {};

        transactions.forEach((t: any) => {
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
    }, [transactions]);

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
                    <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>筛选条件</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                        {/* Date Range */}
                        <div>
                            <label>时间范围</label>
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                                <option value="all">全部时间</option>
                                <option value="7days">最近7天</option>
                                <option value="30days">最近30天</option>
                                <option value="90days">最近90天</option>
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

                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button onClick={applyFilters} className="btn btn-primary">
                            应用筛选
                        </button>
                        <button onClick={resetFilters} className="btn btn-secondary">
                            重置
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                    <div className="glass-card" style={{ padding: "1.5rem" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>总使用量</div>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-accent)" }}>{stats.totalQuantity}</div>
                    </div>
                    <div className="glass-card" style={{ padding: "1.5rem" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>总成本</div>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-accent)" }}>¥{stats.totalCost.toFixed(2)}</div>
                    </div>
                    <div className="glass-card" style={{ padding: "1.5rem" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>交易次数</div>
                        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-accent)" }}>{stats.transactionCount}</div>
                    </div>
                    <div className="glass-card" style={{ padding: "1.5rem" }}>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>最常用商品</div>
                        <div style={{ fontSize: "1.125rem", fontWeight: "bold", color: "var(--text-primary)" }}>{stats.mostUsedProduct}</div>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>使用量: {stats.mostUsedQuantity}</div>
                    </div>
                </div>

                {/* Charts */}
                {transactions.length > 0 ? (
                    <>
                        {/* Usage Trend */}
                        <div className="glass-panel" style={{ padding: "1.5rem" }}>
                            <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>使用趋势</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={usageTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--bg-panel)",
                                            border: "1px solid var(--border-light)",
                                            borderRadius: "var(--radius-sm)",
                                            color: "var(--text-primary)"
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="quantity" stroke="#38bdf8" strokeWidth={2} name="使用量" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Department Distribution & Product Ranking */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1rem" }}>
                            {/* Department Distribution */}
                            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                                <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>部门分布</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={departmentData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {departmentData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--bg-panel)",
                                                border: "1px solid var(--border-light)",
                                                borderRadius: "var(--radius-sm)",
                                                color: "var(--text-primary)"
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Product Ranking */}
                            <div className="glass-panel" style={{ padding: "1.5rem" }}>
                                <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>商品使用排行 (Top 10)</h3>
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
