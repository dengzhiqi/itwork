export interface Theme {
    name: string;
    displayName: string;
    colors: {
        bgApp: string;
        bgPanel: string;
        bgCard: string;
        bgInput: string;
        bgSecondary: string;
        textPrimary: string;
        textSecondary: string;
        textInput: string;
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
    },
    'warm-sunset': {
        name: 'warm-sunset',
        displayName: 'Amber Night',
        colors: {
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
    },
    'sakura-pink': {
        name: 'sakura-pink',
        displayName: 'Sakura Pink',
        colors: {
            bgApp: '#fff0f5', // Lavender Blush
            bgPanel: 'rgba(255, 240, 245, 0.9)',
            bgCard: 'rgba(255, 255, 255, 0.65)',
            bgInput: 'rgba(255, 255, 255, 0.85)', // Light white for inputs
            bgSecondary: 'rgba(255, 240, 245, 0.6)',
            textPrimary: '#2d1b20', // Darker purplish brown
            textSecondary: '#5d3a43', // Previous primary color -> new secondary
            textInput: '#3d2a2f', // Darker for better contrast in light inputs
            textAccent: '#d65d7a', // Deep Pink
            borderLight: 'rgba(214, 93, 122, 0.15)',
            primaryGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            dangerColor: '#ef5350',
            successColor: '#66bb6a',
            backgroundGradient1: 'rgba(255, 154, 158, 0.12)',
            backgroundGradient2: 'rgba(254, 207, 239, 0.12)',
        },
    },
    'purple-dream': {
        name: 'purple-dream',
        displayName: 'Velvet Night',
        colors: {
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
    },
    'warm-ivory': {
        name: 'warm-ivory',
        displayName: 'Warm Ivory',
        colors: {
            bgApp: '#fdfcfa',
            bgPanel: 'rgba(255, 253, 250, 0.95)',
            bgCard: 'rgba(250, 248, 245, 0.9)',
            bgInput: 'rgba(255, 255, 255, 0.9)', // Very light for inputs
            bgSecondary: 'rgba(250, 248, 245, 0.7)',
            textPrimary: '#2c2a28',
            textSecondary: '#6b6560',
            textInput: '#2c2a28',
            textAccent: '#8b7355',
            borderLight: 'rgba(139, 115, 85, 0.15)',
            primaryGradient: 'linear-gradient(135deg, #a08060 0%, #8b7355 100%)',
            dangerColor: '#dc2626',
            successColor: '#16a34a',
            backgroundGradient1: 'rgba(160, 128, 96, 0.08)',
            backgroundGradient2: 'rgba(139, 115, 85, 0.08)',
        },
    },
};

export const defaultTheme = 'ocean-blue';

export function getTheme(themeName: string): Theme {
    return themes[themeName] || themes[defaultTheme];
}

// Compatibility exports for legacy code
export interface CustomThemeColors {
    backgroundColor: string;
    primaryColor1: string;
    primaryColor2: string;
    headingColor: string;
    textColor: string;
}

export const defaultCustomColors: CustomThemeColors = {
    backgroundColor: '#0f172a',
    primaryColor1: '#38bdf8',
    primaryColor2: '#818cf8',
    headingColor: '#f1f5f9',
    textColor: '#94a3b8',
};

export function loadCustomColors(): CustomThemeColors {
    return defaultCustomColors;
}

export function saveCustomColors(_colors: CustomThemeColors): void {
    // No-op for compatibility
}

export function generateCustomTheme(_colors: CustomThemeColors): Theme {
    return themes[defaultTheme];
}
