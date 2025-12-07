export interface Theme {
    name: string;
    displayName: string;
    colors: {
        bgApp: string;
        bgPanel: string;
        bgCard: string;
        textPrimary: string;
        textSecondary: string;
        textAccent: string;
        borderLight: string;
        primaryGradient: string;
        dangerColor: string;
        successColor: string;
        backgroundGradient1: string;
        backgroundGradient2: string;
    };
}

export const themes: Record<string, Theme> = {
    'ocean-blue': {
        name: 'ocean-blue',
        displayName: 'Ocean Blue',
        colors: {
            bgApp: '#0f172a',
            bgPanel: 'rgba(30, 41, 59, 0.7)',
            bgCard: 'rgba(51, 65, 85, 0.5)',
            textPrimary: '#f1f5f9',
            textSecondary: '#94a3b8',
            textAccent: '#38bdf8',
            borderLight: 'rgba(148, 163, 184, 0.1)',
            primaryGradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            dangerColor: '#ef4444',
            successColor: '#22c55e',
            backgroundGradient1: 'rgba(56, 189, 248, 0.15)',
            backgroundGradient2: 'rgba(129, 140, 248, 0.15)',
        },
    },
    'warm-sunset': {
        name: 'warm-sunset',
        displayName: 'Warm Sunset',
        colors: {
            bgApp: '#fef9f0',
            bgPanel: 'rgba(254, 249, 240, 0.9)',
            bgCard: 'rgba(255, 253, 245, 0.8)',
            textPrimary: '#5a4a2f',
            textSecondary: '#9b8b6f',
            textAccent: '#d4a574',
            borderLight: 'rgba(155, 139, 111, 0.15)',
            primaryGradient: 'linear-gradient(135deg, #d4a574 0%, #c9a66b 100%)',
            dangerColor: '#dc2626',
            successColor: '#16a34a',
            backgroundGradient1: 'rgba(212, 165, 116, 0.08)',
            backgroundGradient2: 'rgba(201, 166, 107, 0.08)',
        },
    },
    'forest-green': {
        name: 'forest-green',
        displayName: 'Forest Green',
        colors: {
            bgApp: '#e8f4f8',
            bgPanel: 'rgba(232, 244, 248, 0.9)',
            bgCard: 'rgba(240, 248, 251, 0.8)',
            textPrimary: '#2c4a5a',
            textSecondary: '#5a7a8a',
            textAccent: '#6b9fb5',
            borderLight: 'rgba(90, 122, 138, 0.15)',
            primaryGradient: 'linear-gradient(135deg, #9cc4d4 0%, #6b9fb5 100%)',
            dangerColor: '#dc2626',
            successColor: '#16a34a',
            backgroundGradient1: 'rgba(156, 196, 212, 0.12)',
            backgroundGradient2: 'rgba(107, 159, 181, 0.12)',
        },
    },
    'purple-dream': {
        name: 'purple-dream',
        displayName: 'Purple Dream',
        colors: {
            bgApp: '#f8f0f8',
            bgPanel: 'rgba(248, 240, 248, 0.9)',
            bgCard: 'rgba(252, 245, 252, 0.8)',
            textPrimary: '#5a3a5a',
            textSecondary: '#9b7a9b',
            textAccent: '#c89bc8',
            borderLight: 'rgba(155, 122, 155, 0.15)',
            primaryGradient: 'linear-gradient(135deg, #d4a8d4 0%, #c89bc8 100%)',
            dangerColor: '#dc2626',
            successColor: '#16a34a',
            backgroundGradient1: 'rgba(212, 168, 212, 0.12)',
            backgroundGradient2: 'rgba(200, 155, 200, 0.12)',
        },
    },
};

export const defaultTheme = 'ocean-blue';

export interface CustomThemeColors {
    primaryColor1: string;
    primaryColor2: string;
    headingColor: string;
    textColor: string;
    backgroundColor: string;
}

export const defaultCustomColors: CustomThemeColors = {
    primaryColor1: '#38bdf8',
    primaryColor2: '#818cf8',
    headingColor: '#ffffff',
    textColor: '#f1f5f9',
    backgroundColor: '#0f172a',
};

export function loadCustomColors(): CustomThemeColors {
    if (typeof window === 'undefined') return defaultCustomColors;

    const saved = localStorage.getItem('customThemeColors');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return defaultCustomColors;
        }
    }
    return defaultCustomColors;
}

export function saveCustomColors(colors: CustomThemeColors) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('customThemeColors', JSON.stringify(colors));
    }
}

export function generateCustomTheme(colors: CustomThemeColors): Theme {
    return {
        name: 'custom',
        displayName: '自定义主题',
        colors: {
            bgApp: colors.backgroundColor,
            bgPanel: `${colors.backgroundColor}b3`,
            bgCard: `${colors.backgroundColor}80`,
            textPrimary: colors.textColor,
            textSecondary: '#94a3b8',
            textAccent: colors.primaryColor1,
            borderLight: 'rgba(148, 163, 184, 0.1)',
            primaryGradient: `linear-gradient(135deg, ${colors.primaryColor1} 0%, ${colors.primaryColor2} 100%)`,
            dangerColor: '#ef4444',
            successColor: '#22c55e',
            backgroundGradient1: `${colors.primaryColor1}26`,
            backgroundGradient2: `${colors.primaryColor2}26`,
        },
    };
}

export function getTheme(themeName: string, customColors?: CustomThemeColors): Theme {
    if (themeName === 'custom') {
        const colors = customColors || loadCustomColors();
        return generateCustomTheme(colors);
    }
    return themes[themeName] || themes[defaultTheme];
}
