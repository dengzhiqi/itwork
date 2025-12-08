import { Link, useLocation } from "@remix-run/react";
import "../styles/global.css";

export default function Layout({ children, user }: { children: React.ReactNode; user?: string }) {
    const location = useLocation();

    const navItems = [
        { label: "仪表盘", path: "/" },
        { label: "库存管理", path: "/inventory" },
        { label: "出库管理", path: "/transactions?type=OUT" },
        { label: "入库管理", path: "/transactions?type=IN" },
        { label: "设置", path: "/settings" },
    ];

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Sidebar */}
            <aside
                className="glass-panel"
                style={{
                    width: "260px",
                    margin: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    padding: "1.5rem",
                    position: "sticky",
                    top: "1rem",
                    height: "calc(100vh - 2rem)",
                }}
            >
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "1.5rem", margin: 0, background: "var(--primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        ItWork
                    </h1>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>办公用品管理</p>
                </div>

                <nav style={{ flex: 1 }}>
                    <ul style={{ listStyle: "none" }}>
                        {navItems.map((item) => {
                            const currentPath = location.pathname + location.search;
                            const isActive = currentPath === item.path ||
                                location.pathname === item.path ||
                                (item.path === "/settings" && location.pathname.startsWith("/settings"));
                            return (
                                <li key={item.path} style={{ marginBottom: "0.5rem" }}>
                                    <Link
                                        to={item.path}
                                        style={{
                                            display: "block",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                                            color: isActive ? "var(--text-accent)" : "var(--text-secondary)",
                                            fontWeight: isActive ? 600 : 400,
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-light)" }}>
                    {user ? (
                        <form action="/logout" method="post">
                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    background: "none",
                                    border: "none",
                                    color: "var(--danger-color)",
                                    padding: "0.5rem 1rem",
                                    fontSize: "0.875rem",
                                    cursor: "pointer",
                                    textAlign: "left"
                                }}
                            >
                                退出登录
                            </button>
                        </form>
                    ) : (
                        <Link to="/login" className="btn btn-primary" style={{ width: "100%", fontSize: "0.875rem" }}>
                            登录
                        </Link>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: "1rem", maxWidth: "1200px", width: "100%" }}>
                {children}
            </main>
        </div>
    );
}
