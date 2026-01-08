import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/cloudflare";
import { ThemeProvider } from "./contexts/ThemeContext";

export const links: LinksFunction = () => [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
    },
];

export default function App() {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
                {/* Apply theme immediately to prevent flash */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const themes = {
                                        'ocean-blue': {
                                            bgApp: '#0f172a',
                                            bgPanel: 'rgba(30, 41, 59, 0.7)',
                                            bgCard: 'rgba(51, 65, 85, 0.5)',
                                            bgInput: 'rgba(15, 23, 42, 0.6)',
                                            bgSecondary: 'rgba(30, 41, 59, 0.5)',
                                            textPrimary: '#f1f5f9',
                                            textSecondary: '#94a3b8',
                                            textInput: '#f1f5f9',
                                            textAccent: '#38bdf8',
                                            borderLight: 'rgba(148, 163, 184, 0.1)',
                                            primaryGradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                                            dangerColor: '#ef4444',
                                            successColor: '#22c55e',
                                            backgroundGradient1: 'rgba(56, 189, 248, 0.15)',
                                            backgroundGradient2: 'rgba(129, 140, 248, 0.15)',
                                        },
                                        'warm-sunset': {
                                            bgApp: '#1a1512',
                                            bgPanel: 'rgba(42, 36, 30, 0.85)',
                                            bgCard: 'rgba(58, 48, 38, 0.6)',
                                            bgInput: 'rgba(26, 21, 18, 0.6)',
                                            bgSecondary: 'rgba(42, 36, 30, 0.5)',
                                            textPrimary: '#f5ebe0',
                                            textSecondary: '#b8a898',
                                            textInput: '#f5ebe0',
                                            textAccent: '#f0a050',
                                            borderLight: 'rgba(180, 160, 140, 0.12)',
                                            primaryGradient: 'linear-gradient(135deg, #f0a050 0%, #e07830 100%)',
                                            dangerColor: '#ef5350',
                                            successColor: '#66bb6a',
                                            backgroundGradient1: 'rgba(240, 160, 80, 0.12)',
                                            backgroundGradient2: 'rgba(224, 120, 48, 0.12)',
                                        },
                                        'sakura-pink': {
                                            bgApp: '#fff0f5',
                                            bgPanel: 'rgba(255, 240, 245, 0.9)',
                                            bgCard: 'rgba(255, 255, 255, 0.65)',
                                            bgInput: 'rgba(255, 255, 255, 0.85)',
                                            bgSecondary: 'rgba(255, 240, 245, 0.6)',
                                            textPrimary: '#2d1b20',
                                            textSecondary: '#5d3a43',
                                            textInput: '#3d2a2f',
                                            textAccent: '#d65d7a',
                                            borderLight: 'rgba(214, 93, 122, 0.15)',
                                            primaryGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                            dangerColor: '#ef5350',
                                            successColor: '#66bb6a',
                                            backgroundGradient1: 'rgba(255, 154, 158, 0.12)',
                                            backgroundGradient2: 'rgba(254, 207, 239, 0.12)',
                                        },
                                        'purple-dream': {
                                            bgApp: '#12101a',
                                            bgPanel: 'rgba(30, 25, 45, 0.85)',
                                            bgCard: 'rgba(45, 38, 65, 0.6)',
                                            bgInput: 'rgba(18, 16, 26, 0.6)',
                                            bgSecondary: 'rgba(30, 25, 45, 0.5)',
                                            textPrimary: '#e8e0f0',
                                            textSecondary: '#a090b8',
                                            textInput: '#e8e0f0',
                                            textAccent: '#a78bfa',
                                            borderLight: 'rgba(140, 120, 180, 0.12)',
                                            primaryGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                                            dangerColor: '#ef5350',
                                            successColor: '#66bb6a',
                                            backgroundGradient1: 'rgba(167, 139, 250, 0.12)',
                                            backgroundGradient2: 'rgba(139, 92, 246, 0.12)',
                                        },
                                        'warm-ivory': {
                                            bgApp: '#f5f7fa',
                                            bgPanel: 'rgba(255, 255, 255, 0.95)',
                                            bgCard: 'rgba(255, 255, 255, 0.9)',
                                            bgInput: 'rgba(255, 255, 255, 0.95)',
                                            bgSecondary: 'rgba(245, 247, 250, 0.8)',
                                            textPrimary: '#1e293b',
                                            textSecondary: '#64748b',
                                            textInput: '#1e293b',
                                            textAccent: '#5b7fff',
                                            borderLight: 'rgba(148, 163, 184, 0.12)',
                                            primaryGradient: 'linear-gradient(135deg, #5b7fff 0%, #e879f9 100%)',
                                            dangerColor: '#ef4444',
                                            successColor: '#10b981',
                                            backgroundGradient1: 'rgba(91, 127, 255, 0.08)',
                                            backgroundGradient2: 'rgba(232, 121, 249, 0.08)',
                                        },
                                    };
                                    
                                    const savedTheme = localStorage.getItem('theme') || 'ocean-blue';
                                    const colors = themes[savedTheme] || themes['ocean-blue'];
                                    const root = document.documentElement;
                                    
                                    root.style.setProperty('--bg-app', colors.bgApp);
                                    root.style.setProperty('--bg-panel', colors.bgPanel);
                                    root.style.setProperty('--bg-card', colors.bgCard);
                                    root.style.setProperty('--bg-input', colors.bgInput);
                                    root.style.setProperty('--bg-secondary', colors.bgSecondary);
                                    root.style.setProperty('--text-primary', colors.textPrimary);
                                    root.style.setProperty('--text-secondary', colors.textSecondary);
                                    root.style.setProperty('--text-input', colors.textInput);
                                    root.style.setProperty('--text-accent', colors.textAccent);
                                    root.style.setProperty('--border-light', colors.borderLight);
                                    root.style.setProperty('--primary-gradient', colors.primaryGradient);
                                    root.style.setProperty('--danger-color', colors.dangerColor);
                                    root.style.setProperty('--success-color', colors.successColor);
                                    root.style.setProperty('--bg-gradient-1', colors.backgroundGradient1);
                                    root.style.setProperty('--bg-gradient-2', colors.backgroundGradient2);
                                } catch (e) {
                                    // Silently fail if localStorage is not available
                                }
                            })();
                        `,
                    }}
                />
            </head>
            <body>
                <ThemeProvider>
                    <Outlet />
                </ThemeProvider>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}
