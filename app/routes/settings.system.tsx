import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import Layout from "../components/Layout";
import { requireUser } from "../utils/auth.server";
import { useTheme } from "../contexts/ThemeContext";
import { themes } from "../utils/themes";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { env } = context as { env: any };
    const user = await requireUser(request, env);
    return json({ user });
}

export default function SystemSettings() {
    const { user } = useLoaderData<typeof loader>();
    const { currentTheme, setTheme } = useTheme();

    const themeList = Object.values(themes);

    return (
        <Layout user={user}>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
                <h2 style={{ marginBottom: "0.5rem" }}>系统设置</h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>自定义系统外观和行为</p>

                <div style={{ marginBottom: "2rem" }}>
                    <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>主题配色</h3>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                        选择您喜欢的配色方案，更改会立即生效
                    </p>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "1rem"
                    }}>
                        {themeList.map((theme) => {
                            const isActive = currentTheme === theme.name;
                            return (
                                <button
                                    key={theme.name}
                                    onClick={() => setTheme(theme.name)}
                                    style={{
                                        position: "relative",
                                        padding: "1.5rem",
                                        background: theme.colors.bgPanel,
                                        border: isActive
                                            ? `2px solid ${theme.colors.textAccent}`
                                            : "2px solid transparent",
                                        borderRadius: "var(--radius-md)",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        textAlign: "left",
                                        boxShadow: isActive
                                            ? `0 0 20px ${theme.colors.textAccent}40`
                                            : "none",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.transform = "translateY(-4px)";
                                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "none";
                                        }
                                    }}
                                >
                                    {isActive && (
                                        <div style={{
                                            position: "absolute",
                                            top: "0.75rem",
                                            right: "0.75rem",
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                            background: theme.colors.primaryGradient,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "white",
                                            fontSize: "0.75rem",
                                            fontWeight: "bold",
                                        }}>
                                            ✓
                                        </div>
                                    )}

                                    <div style={{ marginBottom: "1rem" }}>
                                        <h4 style={{
                                            fontSize: "1rem",
                                            fontWeight: "600",
                                            color: theme.colors.textPrimary,
                                            marginBottom: "0.25rem"
                                        }}>
                                            {theme.displayName}
                                        </h4>
                                    </div>

                                    {/* Color preview */}
                                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                        <div style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "var(--radius-sm)",
                                            background: theme.colors.primaryGradient,
                                        }} />
                                        <div style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "var(--radius-sm)",
                                            background: theme.colors.bgApp,
                                            border: `1px solid ${theme.colors.borderLight}`,
                                        }} />
                                    </div>

                                    <div style={{
                                        fontSize: "0.75rem",
                                        color: theme.colors.textSecondary,
                                    }}>
                                        {theme.name === 'ocean-blue' && '经典蓝色主题'}
                                        {theme.name === 'warm-sunset' && '温暖米黄主题'}
                                        {theme.name === 'forest-green' && '清新绿色主题'}
                                        {theme.name === 'purple-dream' && '优雅紫色主题'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
