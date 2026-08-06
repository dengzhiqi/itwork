import { Link, useLocation } from "@remix-run/react";
import "../styles/global.css";
import Icon from "./Icon";

export default function Layout({ children, user }: { children: React.ReactNode; user?: string }) {
    const location = useLocation();

    const navItems = [
        { label: "仪表盘", path: "/", icon: "dashboard" as const },
        { label: "出库管理", path: "/transactions?type=OUT", icon: "transactions" as const },
        { label: "入库管理", path: "/transactions?type=IN", icon: "transactions" as const },
        { label: "库存管理", path: "/inventory", icon: "inventory" as const },
        { label: "报表", path: "/reports", icon: "reports" as const },
        { label: "设置", path: "/settings", icon: "settings" as const },
    ];

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: "240px",
                    display: "flex",
                    flexDirection: "column",
                    padding: "1.5rem 1rem",
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    background: "var(--bg-panel)",
                    borderRight: "1px solid var(--border-light)",
                    flexShrink: 0,
                }}
            >
                {/* Logo */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    marginBottom: '2rem',
                    padding: '0 0.5rem',
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--primary-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Icon name="package" size={20} style={{ color: '#fff' }} />
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: "1.125rem",
                            fontWeight: 700,
                            margin: 0,
                            color: "var(--text-primary)",
                            lineHeight: 1.2,
                        }}>
                            ItWork
                        </h1>
                        <p style={{
                            fontSize: "0.6875rem",
                            color: "var(--text-secondary)",
                            margin: 0,
                            lineHeight: 1.2,
                        }}>
                            办公用品管理
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1 }}>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {navItems.map((item) => {
                            const currentPath = location.pathname + location.search;
                            const isActive = currentPath === item.path ||
                                location.pathname === item.path ||
                                (item.path === "/settings" && location.pathname.startsWith("/settings"));
                            return (
                                <li key={item.path} style={{ marginBottom: "0.125rem" }}>
                                    <Link
                                        to={item.path}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: isActive ? "var(--bg-secondary)" : "transparent",
                                            color: isActive ? "var(--text-accent)" : "var(--text-secondary)",
                                            fontWeight: isActive ? 600 : 400,
                                            fontSize: "0.875rem",
                                            transition: "all 0.15s",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <Icon
                                            name={item.icon}
                                            size={18}
                                            style={{
                                                color: isActive ? "var(--text-accent)" : "var(--text-secondary)",
                                            }}
                                        />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User section */}
                <div style={{
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-light)",
                }}>
                    {user ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem", padding: "0 0.5rem" }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--primary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                flexShrink: 0,
                            }}>
                                {user.charAt(0).toUpperCase()}
                            </div>
                            <span style={{
                                fontSize: "0.8125rem",
                                color: "var(--text-primary)",
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {user}
                            </span>
                        </div>
                    ) : null}

                    {user ? (
                        <form action="/logout" method="post">
                            <button
                                type="submit"
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "var(--radius-sm)",
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-secondary)",
                                    fontSize: "0.8125rem",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s",
                                }}
                            >
                                <Icon name="logout" size={18} />
                                退出登录
                            </button>
                        </form>
                    ) : (
                        <Link
                            to="/login"
                            className="btn btn-primary"
                            style={{ width: "100%", fontSize: "0.8125rem" }}
                        >
                            登录
                        </Link>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: "2rem 2.5rem",
                maxWidth: "1200px",
                width: "100%",
                overflowX: "hidden",
            }}>
                {children}
            </main>
        </div>
    );
}
