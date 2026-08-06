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
                                        'clean-white': {
                                            bgApp: '#f8f9fa',
                                            bgPanel: '#ffffff',
                                            bgCard: '#ffffff',
                                            bgInput: '#ffffff',
                                            bgSecondary: '#f1f3f5',
                                            textPrimary: '#212529',
                                            textSecondary: '#868e96',
                                            textInput: '#212529',
                                            textAccent: '#4c6ef5',
                                            borderLight: '#e9ecef',
                                            primaryGradient: 'linear-gradient(135deg, #4c6ef5 0%, #748ffc 100%)',
                                            primarySolid: '#4c6ef5',
                                            primaryHover: '#3b5bdb',
                                            dangerColor: '#fa5252',
                                            successColor: '#37b24d',
                                            backgroundGradient1: 'rgba(76, 110, 245, 0.03)',
                                            backgroundGradient2: 'rgba(116, 143, 252, 0.03)',
                                        },
                                        'ocean-blue': {
                                            bgApp: '#0f172a',
                                            bgPanel: '#1e293b',
                                            bgCard: '#334155',
                                            bgInput: '#0f172a',
                                            bgSecondary: '#1e293b',
                                            textPrimary: '#f1f5f9',
                                            textSecondary: '#94a3b8',
                                            textInput: '#f1f5f9',
                                            textAccent: '#38bdf8',
                                            borderLight: 'rgba(148, 163, 184, 0.15)',
                                            primaryGradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                                            primarySolid: '#38bdf8',
                                            primaryHover: '#0ea5e9',
                                            dangerColor: '#ef4444',
                                            successColor: '#22c55e',
                                            backgroundGradient1: 'rgba(56, 189, 248, 0.08)',
                                            backgroundGradient2: 'rgba(129, 140, 248, 0.08)',
                                        },
                                        'warm-sunset': {
                                            bgApp: '#1a1512',
                                            bgPanel: '#2a241e',
                                            bgCard: '#3a3026',
                                            bgInput: '#1a1512',
                                            bgSecondary: '#2a241e',
                                            textPrimary: '#f5ebe0',
                                            textSecondary: '#b8a898',
                                            textInput: '#f5ebe0',
                                            textAccent: '#f0a050',
                                            borderLight: 'rgba(180, 160, 140, 0.12)',
                                            primaryGradient: 'linear-gradient(135deg, #f0a050 0%, #e07830 100%)',
                                            primarySolid: '#f0a050',
                                            primaryHover: '#d97706',
                                            dangerColor: '#ef5350',
                                            successColor: '#66bb6a',
                                            backgroundGradient1: 'rgba(240, 160, 80, 0.08)',
                                            backgroundGradient2: 'rgba(224, 120, 48, 0.08)',
                                        },
                                        'sakura-pink': {
                                            bgApp: '#fff0f5',
                                            bgPanel: '#ffffff',
                                            bgCard: '#ffffff',
                                            bgInput: '#ffffff',
                                            bgSecondary: '#fff0f5',
                                            textPrimary: '#2d1b20',
                                            textSecondary: '#5d3a43',
                                            textInput: '#3d2a2f',
                                            textAccent: '#d65d7a',
                                            borderLight: 'rgba(214, 93, 122, 0.15)',
                                            primaryGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                            primarySolid: '#d65d7a',
                                            primaryHover: '#c04464',
                                            dangerColor: '#ef5350',
                                            successColor: '#66bb6a',
                                            backgroundGradient1: 'rgba(255, 154, 158, 0.08)',
                                            backgroundGradient2: 'rgba(254, 207, 239, 0.08)',
                                        },
                                        'purple-dream': {
                                            bgApp: '#12101a',
                                            bgPanel: '#1e192d',
                                            bgCard: '#2d2641',
                                            bgInput: '#12101a',
                                            bgSecondary: '#1e192d',
                                            textPrimary: '#e8e0f0',
                                            textSecondary: '#a090b8',
                                            textInput: '#e8e0f0',
                                            textAccent: '#a78bfa',
                                            borderLight: 'rgba(140, 120, 180, 0.12)',
                                            primaryGradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                                            primarySolid: '#a78bfa',
                                            primaryHover: '#8b5cf6',
                                            dangerColor: '#ef5350',
                                            successColor: '#66bb6a',
                                            backgroundGradient1: 'rgba(167, 139, 250, 0.08)',
                                            backgroundGradient2: 'rgba(139, 92, 246, 0.08)',
                                        },
                                        'warm-ivory': {
                                            bgApp: '#f5f7fa',
                                            bgPanel: '#ffffff',
                                            bgCard: '#ffffff',
                                            bgInput: '#ffffff',
                                            bgSecondary: '#f1f3f5',
                                            textPrimary: '#1e293b',
                                            textSecondary: '#64748b',
                                            textInput: '#1e293b',
                                            textAccent: '#5b7fff',
                                            borderLight: 'rgba(148, 163, 184, 0.12)',
                                            primaryGradient: 'linear-gradient(135deg, #5b7fff 0%, #e879f9 100%)',
                                            primarySolid: '#5b7fff',
                                            primaryHover: '#3b5bdb',
                                            dangerColor: '#ef4444',
                                            successColor: '#10b981',
                                            backgroundGradient1: 'rgba(91, 127, 255, 0.05)',
                                            backgroundGradient2: 'rgba(232, 121, 249, 0.05)',
                                        },
                                    };
                                    
                                    const savedTheme = localStorage.getItem('theme') || 'clean-white';
                                    const colors = themes[savedTheme] || themes['clean-white'];
                                    const root = document.documentElement;
                                    
                                    root.style.setProperty('--bg-app', colors.bgApp);
                                    root.style.setProperty('--bg-panel', colors.bgPanel);
                                    root.style.setProperty('--bg-card', colors.bgCard);
                                    root.style.setProperty('--bg-input', colors.bgInput);
                                    root.style.setProperty('--bg-secondary', colors.bgSecondary);
                                    root.style.setProperty('--bg-hover', colors.bgSecondary);
                                    root.style.setProperty('--text-primary', colors.textPrimary);
                                    root.style.setProperty('--text-secondary', colors.textSecondary);
                                    root.style.setProperty('--text-input', colors.textInput);
                                    root.style.setProperty('--text-accent', colors.textAccent);
                                    root.style.setProperty('--border-light', colors.borderLight);
                                    root.style.setProperty('--border-medium', colors.borderLight);
                                    root.style.setProperty('--primary-gradient', colors.primaryGradient);
                                    root.style.setProperty('--primary-solid', colors.primarySolid);
                                    root.style.setProperty('--primary-hover', colors.primaryHover);
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
