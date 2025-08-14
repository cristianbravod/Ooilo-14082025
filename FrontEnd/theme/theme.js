// theme/theme.js - TEMA MEXICANO COMPLETO CORREGIDO
import { Platform } from 'react-native';

// ✅ TEMA MEXICANO CON VALORES NUMÉRICOS VALIDADOS
export const MexicanTheme = {
  colors: {
    // Colores principales del chef mexicano
    primary: '#D2691E',         // Naranja chocolate
    primaryDark: '#8B4513',     // Marrón silla de montar
    primaryLight: '#F4A460',    // Marrón arenoso claro
    
    // Colores de acento
    accent: '#CD853F',          // Oro peruano
    accentLight: '#DEB887',     // Marrón burla de madera
    accentDark: '#A0522D',      // Siena
    
    // Colores de fondo
    background: '#FFF8DC',      // Seda de maíz
    backgroundLight: '#FFFAF0', // Blanco floral
    backgroundDark: '#2F2F2F',  // Gris muy oscuro
    
    // Colores de texto
    text: '#2c3e50',
    textPrimary: '#2F2F2F',     // Gris muy oscuro
    textSecondary: '#8B4513',   // Marrón silla de montar
    textAccent: '#D2691E',      // Naranja chocolate
    textLight: '#FFFFFF',       // Blanco
    
    // Colores de estado
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#3498db',
    
    // Colores neutros
    white: '#FFFFFF',
    black: '#000000',
    gray: '#808080',
    lightGray: '#D3D3D3',
    darkGray: '#696969',
    
    // Colores adicionales
    border: '#bdc3c7',
    borderLight: '#ecf0f1',
    shadow: '#000000',
  },

  // ✅ TIPOGRAFÍA CON VALORES NUMÉRICOS ÚNICAMENTE
  typography: {
    fontSize: {
      xs: 10,     // ✅ CORREGIDO: Números en lugar de strings
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      '2xl': 20,
      '3xl': 24,
      '4xl': 28,
      '5xl': 32,
      title: 24,
      heading: 28,
      display: 32,
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },
  },

  // ✅ ESPACIADO CON VALORES NUMÉRICOS ÚNICAMENTE
  spacing: {
    xs: 4,      // ✅ CORREGIDO: Números en lugar de strings
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // ✅ BORDES CON VALORES NUMÉRICOS ÚNICAMENTE
  borderRadius: {
    none: 0,    // ✅ CORREGIDO: Números en lugar de strings
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  // ✅ SOMBRAS PARA DIFERENTES PLATAFORMAS
  shadows: {
    small: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    large: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
};

// ✅ TAMAÑOS DE ICONOS CORREGIDOS (SOLO NÚMEROS)
export const IconSizes = {
  xs: 12,     // ✅ CORREGIDO: Números únicamente
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
  '5xl': 48,
};

// ✅ ESTILOS COMUNES CON VALIDACIÓN DE TIPOS
export const CommonStyles = {
  container: {
    flex: 1,
    backgroundColor: MexicanTheme.colors.background,
  },

  card: {
    backgroundColor: MexicanTheme.colors.background,
    borderRadius: MexicanTheme.borderRadius.lg,
    padding: MexicanTheme.spacing.md,
    marginVertical: MexicanTheme.spacing.sm,
    borderWidth: 1,
    borderColor: MexicanTheme.colors.borderLight,
    ...MexicanTheme.shadows.small,
  },

  // Botones
  primaryButton: {
    backgroundColor: MexicanTheme.colors.primary,
    borderRadius: MexicanTheme.borderRadius.md,
    paddingVertical: MexicanTheme.spacing.sm,
    paddingHorizontal: MexicanTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...MexicanTheme.shadows.small,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: MexicanTheme.colors.primary,
    borderRadius: MexicanTheme.borderRadius.md,
    paddingVertical: MexicanTheme.spacing.sm,
    paddingHorizontal: MexicanTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  buttonText: {
    fontSize: MexicanTheme.typography.fontSize.md,
    fontWeight: MexicanTheme.typography.fontWeight.semibold,
    color: MexicanTheme.colors.textLight,
  },

  secondaryButtonText: {
    fontSize: MexicanTheme.typography.fontSize.md,
    fontWeight: MexicanTheme.typography.fontWeight.semibold,
    color: MexicanTheme.colors.primary,
  },

  // Headers
  headerContainer: {
    backgroundColor: MexicanTheme.colors.background,
    paddingHorizontal: MexicanTheme.spacing.md,
    paddingVertical: MexicanTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MexicanTheme.colors.borderLight,
    ...MexicanTheme.shadows.small,
  },

  headerTitle: {
    fontSize: MexicanTheme.typography.fontSize['3xl'],
    fontWeight: MexicanTheme.typography.fontWeight.bold,
    color: MexicanTheme.colors.textPrimary,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: MexicanTheme.typography.fontSize.lg,
    color: MexicanTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22, // ✅ CORREGIDO: Valor numérico
  },

  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: MexicanTheme.colors.accentLight,
    borderRadius: MexicanTheme.borderRadius.md,
    paddingHorizontal: MexicanTheme.spacing.md,
    paddingVertical: MexicanTheme.spacing.sm,
    backgroundColor: MexicanTheme.colors.backgroundLight,
    marginBottom: MexicanTheme.spacing.md,
  },

  input: {
    flex: 1,
    marginLeft: MexicanTheme.spacing.sm,
    fontSize: MexicanTheme.typography.fontSize.lg,
    color: MexicanTheme.colors.textPrimary,
  },

  // Headers de secciones
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MexicanTheme.spacing.md,
  },

  sectionTitle: {
    fontSize: MexicanTheme.typography.fontSize.xl,
    fontWeight: MexicanTheme.typography.fontWeight.semibold,
    color: MexicanTheme.colors.textPrimary,
  },

  // Badges/Contadores
  badge: {
    backgroundColor: MexicanTheme.colors.backgroundLight,
    color: MexicanTheme.colors.primary,
    fontWeight: MexicanTheme.typography.fontWeight.bold,
    fontSize: MexicanTheme.typography.fontSize.md,
    paddingHorizontal: MexicanTheme.spacing.sm,
    paddingVertical: MexicanTheme.spacing.xs,
    borderRadius: MexicanTheme.borderRadius.full,
    marginLeft: MexicanTheme.spacing.sm,
  },
};

// ✅ UTILIDADES PARA GENERAR ESTILOS DINÁMICOS
export const ThemeUtils = {
  // Generar estilo de botón con estado
  getButtonStyle: (type = 'primary', disabled = false) => {
    const baseStyle = CommonStyles[`${type}Button`] || CommonStyles.primaryButton;
    return {
      ...baseStyle,
      opacity: disabled ? 0.6 : 1,
    };
  },

  // Generar estilo de texto con color dinámico
  getTextStyle: (color = 'textPrimary', size = 'md', weight = 'normal') => ({
    color: MexicanTheme.colors[color] || MexicanTheme.colors.textPrimary,
    fontSize: MexicanTheme.typography.fontSize[size] || MexicanTheme.typography.fontSize.md,
    fontWeight: MexicanTheme.typography.fontWeight[weight] || MexicanTheme.typography.fontWeight.normal,
  }),

  // Generar estilo de card con variantes
  getCardStyle: (variant = 'default') => {
    const variants = {
      default: CommonStyles.card,
      success: {
        ...CommonStyles.card,
        borderColor: MexicanTheme.colors.success,
        backgroundColor: '#F0FFF0', // Verde muy claro
      },
      warning: {
        ...CommonStyles.card,
        borderColor: MexicanTheme.colors.warning,
        backgroundColor: '#FFF8DC', // Crema
      },
      danger: {
        ...CommonStyles.card,
        borderColor: MexicanTheme.colors.danger,
        backgroundColor: '#FFF0F5', // Rosa muy claro
      },
    };
    return variants[variant] || variants.default;
  },

  // ✅ OBTENER TAMAÑO DE ICONO VÁLIDO
  getIconSize: (size = 'md') => {
    const validSize = IconSizes[size];
    if (typeof validSize !== 'number') {
      console.warn(`⚠️ Tamaño de icono inválido: ${size}, usando 'md' como fallback`);
      return IconSizes.md;
    }
    return validSize;
  },

  // ✅ VALIDAR Y OBTENER VALOR NUMÉRICO
  getNumericValue: (value, fallback = 0) => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    if (value !== fallback) { // Solo mostrar warning si no es el fallback
      console.warn(`⚠️ Valor no numérico detectado: ${value}, usando fallback: ${fallback}`);
    }
    return fallback;
  },

  // ✅ OBTENER ESPACIADO SEGURO
  getSpacing: (size = 'md') => {
    const spacing = MexicanTheme.spacing[size];
    return typeof spacing === 'number' ? spacing : MexicanTheme.spacing.md;
  },

  // ✅ OBTENER BORDER RADIUS SEGURO
  getBorderRadius: (size = 'md') => {
    const radius = MexicanTheme.borderRadius[size];
    return typeof radius === 'number' ? radius : MexicanTheme.borderRadius.md;
  },

  // ✅ OBTENER FONT SIZE SEGURO
  getFontSize: (size = 'md') => {
    const fontSize = MexicanTheme.typography.fontSize[size];
    return typeof fontSize === 'number' ? fontSize : MexicanTheme.typography.fontSize.md;
  },
};

export default MexicanTheme;