import { Link, useLocation } from "@remix-run/react";
style = {{
    width: "260px",
        margin: "1rem",
            display: "flex",
                flexDirection: "column",
                    padding: "1.5rem",
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
                        </div >
    );
}
