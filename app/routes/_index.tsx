import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, useSearchParams, Form, useSubmit } from "@remix-run/react";
import { useState } from "react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    const url = new URL(request.url);

    const currentYearStr = new Date().getFullYear().toString();
    const currentMonthStr = (new Date().getMonth() + 1).toString().padStart(2, '0');

    const year = url.searchParams.get("year") || currentYearStr;
    const month = url.searchParams.get("month") || currentMonthStr; // "all" or "01"-"12"
    const category = url.searchParams.get("category") || null; // Selected category name

    const isAllMonths = month === "all";
    let dateFilter = "";
    let params: any[] = [];

    if (isAllMonths) {
        dateFilter = "strftime('%Y', t.date) = ?";
        params.push(year);
    } else {
        dateFilter = "strftime('%Y-%m', t.date) = ?";
        params.push(`${year}-${month}`);
    }

    try {
        // Category Consumption (Pie Chart) - Only OUT transactions
        const { results: categoryStats } = await env.DB.prepare(`
            SELECT c.name as name, 
                   c.id as categoryId,
                   SUM(t.quantity) as value
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE t.type = 'OUT' AND ${dateFilter}
            GROUP BY c.id
            ORDER BY value DESC
        `).bind(...params).all();

        // Department Consumption (Bar Chart) - Only OUT transactions
        // If category is selected, filter by category
        let departmentQuery = `
            SELECT t.department as name, 
                   SUM(t.quantity) as value
            FROM transactions t
        `;

        const departmentParams: any[] = [];

        if (category) {
            departmentQuery += `
                JOIN products p ON t.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                WHERE t.type = 'OUT' AND t.department IS NOT NULL AND t.department != '' 
                AND ${dateFilter} AND c.name = ?
            `;
            departmentParams.push(...params, category); // Date params first, then category
        } else {
            departmentQuery += `
                WHERE t.type = 'OUT' AND t.department IS NOT NULL AND t.department != '' AND ${dateFilter}
            `;
            departmentParams.push(...params);
        }

        departmentQuery += `
            GROUP BY t.department
            ORDER BY value DESC
        `;

        const { results: departmentStats } = await env.DB.prepare(departmentQuery).bind(...departmentParams).all();

        // Total Statistics - All categories with IN/OUT totals
        const { results: totalStats } = await env.DB.prepare(`
            SELECT c.name as category,
                   SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as total_out,
                   SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as total_in
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE ${dateFilter}
            GROUP BY c.id
            ORDER BY total_out DESC
        `).bind(...params).all();

        const totalItemsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
        const totalItems = totalItemsResult?.count || 0;

        return json({ user, totalItems, categoryStats, departmentStats, totalStats, year, month, category });
    } catch (error) {
        console.error("Database error:", error);
        return json({ user, totalItems: 0, categoryStats: [], departmentStats: [], totalStats: [], year, month, category: null });
    }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>{payload[0].name}</p>
                <p style={{ margin: 0, color: '#fff' }}>数量: {payload[0].value}</p>
            </div>
        );
    }
    return null;
};

export default function Index() {
    const { user, totalItems, categoryStats, departmentStats, totalStats, year, month, category } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const [searchParams, setSearchParams] = useSearchParams();

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        { value: "all", label: "全年" },
        ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: `${i + 1}月` }))
    ];

    const handleChange = (event: any) => {
        submit(event.currentTarget.form);
    };

    const handlePieClick = (data: any) => {
        const newParams = new URLSearchParams(searchParams);
        if (category === data.name) {
            newParams.delete('category'); // Deselect if clicking the same category
        } else {
            newParams.set('category', data.name);
        }
        setSearchParams(newParams);
    };

    const handleClearFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('category');
        setSearchParams(newParams);
    };

    return (
        <Layout user={user}>
            <div style={{ display: "grid", gap: "2rem" }}>
                {/* Header & Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <h1 style={{ marginBottom: "0.5rem" }}>仪表盘</h1>
                        <p style={{ color: "var(--text-secondary)" }}>消耗统计与分析</p>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <Form method="get" style={{ display: "flex", gap: "0.5rem" }}>
                            <select
                                name="year"
                                defaultValue={year}
                                onChange={handleChange}
                                style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)", minWidth: "100px" }}
                            >
                                {years.map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>

                            <select
                                name="month"
                                defaultValue={month}
                                onChange={handleChange}
                                style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}
                            >
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </Form>

                        <Link to="/transactions/new" className="btn btn-primary">
                            快速出库
                        </Link>
                    </div>
                </div>



                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "2rem" }}>

                    {/* Category Pie Chart */}
                    <div className="glass-panel" style={{ padding: "1.5rem", minHeight: "400px" }}>
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                            分类消耗占比
                        </h3>
                        {categoryStats.length > 0 ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={categoryStats}
                                            cx="50%"
                                            cy="45%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            onClick={handlePieClick}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {categoryStats.map((entry: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                    opacity={category && category !== entry.name ? 0.3 : 1}
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomPieTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                暂无数据
                            </div>
                        )}
                    </div>

                    {/* Department Bar Chart */}
                    <div className="glass-panel" style={{ padding: "1.5rem", minHeight: "400px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                            <h3 style={{ fontSize: "1.25rem", margin: 0 }}>
                                部门消耗统计 {category && `(${category})`}
                            </h3>
                            {category && (
                                <button
                                    onClick={handleClearFilter}
                                    style={{
                                        padding: "0.25rem 0.75rem",
                                        background: "rgba(0, 136, 254, 0.2)",
                                        border: "1px solid rgba(0, 136, 254, 0.4)",
                                        borderRadius: "var(--radius-sm)",
                                        color: "var(--text-accent)",
                                        cursor: "pointer",
                                        fontSize: "0.875rem"
                                    }}
                                >
                                    清除筛选
                                </button>
                            )}
                        </div>
                        {departmentStats.length > 0 ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart
                                        data={departmentStats}
                                        margin={{ top: 50, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis />
                                        <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} formatter={(value: number) => [value, "消耗数量"]} />
                                        <Legend verticalAlign="bottom" height={36} />
                                        <Bar dataKey="value" name="消耗数量" fill="#8884d8">
                                            {departmentStats.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                                暂无数据
                            </div>
                        )}
                    </div>
                </div>

                {/* Total Statistics Table */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                        总统计
                    </h3>
                    {totalStats.length > 0 ? (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ color: "var(--text-secondary)", textAlign: "left", fontSize: "0.875rem" }}>
                                    <th style={{ padding: "0.5rem" }}>类别</th>
                                    <th style={{ padding: "0.5rem", textAlign: "right", color: "#fca5a5" }}>出库总数</th>
                                    <th style={{ padding: "0.5rem", textAlign: "right", color: "#86efac" }}>入库总数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {totalStats.map((stat: any, index: number) => (
                                    <tr key={index} style={{ borderBottom: "1px solid var(--border-light)" }}>
                                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{stat.category}</td>
                                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: "bold" }}>{stat.total_out}</td>
                                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "var(--text-secondary)" }}>{stat.total_in}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>暂无数据</p>
                    )}
                </div>
            </div>
        </Layout>
    );
}
