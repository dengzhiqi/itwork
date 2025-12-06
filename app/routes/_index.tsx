import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useLoaderData, useSearchParams, Form, useSubmit } from "@remix-run/react";
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
                   SUM(t.quantity) as value
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE t.type = 'OUT' AND ${dateFilter}
            GROUP BY c.id
            ORDER BY value DESC
        `).bind(...params).all();

        // Department Consumption (Bar Chart) - Only OUT transactions
        const { results: departmentStats } = await env.DB.prepare(`
            SELECT t.department as name, 
                   SUM(t.quantity) as value
            FROM transactions t
            WHERE t.type = 'OUT' AND t.department IS NOT NULL AND t.department != '' AND ${dateFilter}
            GROUP BY t.department
            ORDER BY value DESC
        `).bind(...params).all();

        const totalItemsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM products").first();
        const totalItems = totalItemsResult?.count || 0;

        return json({ user, totalItems, categoryStats, departmentStats, year, month });
    } catch (error) {
        console.error("Database error:", error);
        return json({ user, totalItems: 0, categoryStats: [], departmentStats: [], year, month });
    }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function Index() {
    const { user, totalItems, categoryStats, departmentStats, year, month } = useLoaderData<typeof loader>();
    const submit = useSubmit();

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        { value: "all", label: "全年" },
        ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: `${i + 1}月` }))
    ];

    const handleChange = (event: any) => {
        submit(event.currentTarget.form);
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
                                style={{ padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}
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
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {categoryStats.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => [value, "数量"]} />
                                        <Legend />
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
                        <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>
                            部门消耗统计
                        </h3>
                        {departmentStats.length > 0 ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart
                                        data={departmentStats}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={100} />
                                        <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} formatter={(value: number) => [value, "消耗数量"]} />
                                        <Legend />
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
            </div>
        </Layout>
    );
}
