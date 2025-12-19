/**
 * Premium iOS-inspired theme for emergency contacts app
 * Features refined color palettes, typography, and component styling
 */

import { Platform, TextStyle } from 'react-native';

// ==================== COLOR PALETTES ====================
// Premium color schemes with iOS-inspired sensibility

const premiumColors = {
  // Primary palette - Professional blue with emotional trust/calm[citation:1][citation:5]
  blue: {
    50: '#F5F7FA',
    100: '#E4E9F2',
    200: '#C8D3E5',
    300: '#A5B8D4',
    400: '#7E9BC1',
    500: '#5B7FAD',  // Primary brand color
    600: '#466895',
    700: '#36527C',
    800: '#2A4063',
    900: '#1F304D',
  },
  
  // Secondary palette - Balanced purple for visual interest[citation:5]
  purple: {
    50: '#F7F5FD',
    100: '#EDE9FB',
    200: '#D9D2F8',
    300: '#BEB2F2',
    400: '#9E8CE9',
    500: '#8066DF',  // Secondary accent color
    600: '#6B4CC9',
    700: '#5838AE',
    800: '#47298E',
    900: '#361E6D',
  },
  
  // Semantic colors for clear communication[citation:5]
  semantic: {
    success: '#10B981',     // Emerald green
    warning: '#F59E0B',     // Amber
    error: '#EF4444',       // Red for urgency[citation:5]
    info: '#3B82F6',        // Sky blue
  },
  
  // Neutral palette for backgrounds and text[citation:1][citation:5]
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// ==================== LIGHT THEME ====================
// Clean, airy interface reminiscent of Apple's aesthetic[citation:1]

export const lightTheme = {
  colors: {
    // Core colors
    primary: premiumColors.blue[500],
    secondary: premiumColors.purple[500],
    
    // Background hierarchy (lightest to darkest)
    background: premiumColors.neutral[50],
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    card: '#FFFFFF',
    
    // Text hierarchy
    text: premiumColors.neutral[900],
    textSecondary: premiumColors.neutral[600],
    textTertiary: premiumColors.neutral[400],
    textInverse: '#FFFFFF',
    
    // Borders and dividers
    border: premiumColors.neutral[200],
    separator: premiumColors.neutral[100],
    notification: premiumColors.semantic.error,
    
    // Semantic colors
    ...premiumColors.semantic,
    
    // Component-specific colors
    avatar: {
      primary: '#E63946',       // Emergency red for primary contacts
      secondary: premiumColors.blue[500],
      tertiary: premiumColors.neutral[500],
    },
    
    status: {
      verified: premiumColors.semantic.success,
      unverified: premiumColors.semantic.warning,
      favorite: '#FBBF24',      // Gold star for favorites
    },
  },
  
  // Shadows for depth (iOS-style soft shadows)
  shadows: {
    small: {
      shadowColor: premiumColors.neutral[900],
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: premiumColors.neutral[900],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: premiumColors.neutral[900],
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
  },
};

// ==================== DARK THEME ====================
// Sophisticated dark mode with true blacks and deep colors

export const darkTheme = {
  colors: {
    // Core colors (adjusted for dark mode)
    primary: premiumColors.blue[400],
    secondary: premiumColors.purple[400],
    
    // Background hierarchy (darkest to lightest)
    background: premiumColors.neutral[900],
    surface: premiumColors.neutral[800],
    elevated: premiumColors.neutral[700],
    card: premiumColors.neutral[800],
    
    // Text hierarchy
    text: premiumColors.neutral[50],
    textSecondary: premiumColors.neutral[300],
    textTertiary: premiumColors.neutral[500],
    textInverse: premiumColors.neutral[900],
    
    // Borders and dividers
    border: premiumColors.neutral[700],
    separator: premiumColors.neutral[800],
    notification: '#F87171',
    
    // Semantic colors (adjusted for dark mode)
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    
    // Component-specific colors
    avatar: {
      primary: '#EF4444',
      secondary: premiumColors.blue[400],
      tertiary: premiumColors.neutral[400],
    },
    
    status: {
      verified: '#34D399',
      unverified: '#FBBF24',
      favorite: '#FBBF24',
    },
  },
  
  // Subtle shadows for dark mode
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  },
};

// ==================== TYPOGRAPHY ====================
// iOS-inspired typography system with SF Pro feel

const createTypography = (colorSet: typeof lightTheme.colors) => {
  const baseStyle: Partial<TextStyle> = {
    fontFamily: Platform.select({
      ios: '-apple-system, system-ui, sans-serif',
      android: 'Roboto, sans-serif',
      web: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
      default: 'system',
    }),
  };
  
  return {
    // Display styles (largest text)
    display: {
      large: {
        ...baseStyle,
        fontSize: 36,
        fontWeight: '700' as const,
        lineHeight: 44,
        color: colorSet.text,
      },
      medium: {
        ...baseStyle,
        fontSize: 32,
        fontWeight: '700' as const,
        lineHeight: 40,
        color: colorSet.text,
      },
      small: {
        ...baseStyle,
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 36,
        color: colorSet.text,
      },
    },
    
    // Headline styles (section headers)
    headline: {
      large: {
        ...baseStyle,
        fontSize: 24,
        fontWeight: '700' as const,
        lineHeight: 32,
        color: colorSet.text,
      },
      medium: {
        ...baseStyle,
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
        color: colorSet.text,
      },
      small: {
        ...baseStyle,
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 26,
        color: colorSet.text,
      },
    },
    
    // Title styles (card titles, buttons)
    title: {
      large: {
        ...baseStyle,
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 26,
        color: colorSet.text,
      },
      medium: {
        ...baseStyle,
        fontSize: 16,
        fontWeight: '600' as const,
        lineHeight: 24,
        color: colorSet.text,
      },
      small: {
        ...baseStyle,
        fontSize: 14,
        fontWeight: '600' as const,
        lineHeight: 20,
        color: colorSet.text,
      },
    },
    
    // Body styles (main content)
    body: {
      large: {
        ...baseStyle,
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
        color: colorSet.text,
      },
      medium: {
        ...baseStyle,
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
        color: colorSet.text,
      },
      small: {
        ...baseStyle,
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 18,
        color: colorSet.textSecondary,
      },
    },
    
    // Label styles (captions, metadata)
    label: {
      large: {
        ...baseStyle,
        fontSize: 14,
        fontWeight: '500' as const,
        lineHeight: 20,
        color: colorSet.textSecondary,
      },
      medium: {
        ...baseStyle,
        fontSize: 12,
        fontWeight: '500' as const,
        lineHeight: 16,
        color: colorSet.textTertiary,
      },
      small: {
        ...baseStyle,
        fontSize: 10,
        fontWeight: '500' as const,
        lineHeight: 14,
        color: colorSet.textTertiary,
      },
    },
  };
};

// ==================== EXPORTED THEME ====================

export const Colors = {
  light: lightTheme.colors,
  dark: darkTheme.colors,
};

export const Typography = {
  light: createTypography(lightTheme.colors),
  dark: createTypography(darkTheme.colors),
};

export const Shadows = {
  light: lightTheme.shadows,
  dark: darkTheme.shadows,
};

// Helper for responsive usage
export const getTheme = (isDark: boolean) => ({
  dark: isDark,
  colors: isDark ? Colors.dark : Colors.light,
  typography: isDark ? Typography.dark : Typography.light,
  shadows: isDark ? Shadows.dark : Shadows.light,
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
});

// ==================== COMPONENT STYLES ====================
// Predefined styles for common components using the theme

export const ComponentStyles = {
  // Card styles
  card: (isDark: boolean) => ({
    backgroundColor: getTheme(isDark).colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: getTheme(isDark).colors.border,
    ...getTheme(isDark).shadows.small,
  }),
  
  // Button variants
  button: {
    primary: (isDark: boolean) => ({
      backgroundColor: getTheme(isDark).colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    }),
    secondary: (isDark: boolean) => ({
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: getTheme(isDark).colors.border,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    }),
    emergency: (isDark: boolean) => ({
      backgroundColor: getTheme(isDark).colors.error,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 14,
      ...getTheme(isDark).shadows.medium,
    }),
  },
  
  // Avatar variants (for contact cards)
  avatar: {
    primary: (isDark: boolean) => ({
      backgroundColor: getTheme(isDark).colors.avatar.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
    }),
    secondary: (isDark: boolean) => ({
      backgroundColor: getTheme(isDark).colors.avatar.secondary,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    }),
    tertiary: (isDark: boolean) => ({
      backgroundColor: getTheme(isDark).colors.avatar.tertiary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  
  // Badge variants
  badge: {
    role: {
      primary: (isDark: boolean) => ({
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }),
      secondary: (isDark: boolean) => ({
        backgroundColor: isDark ? 'rgba(91, 127, 173, 0.2)' : 'rgba(91, 127, 173, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }),
      tertiary: (isDark: boolean) => ({
        backgroundColor: isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(107, 114, 128, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }),
    },
    status: {
      verified: (isDark: boolean) => ({
        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }),
      unverified: (isDark: boolean) => ({
        backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }),
    },
  },
};