// Tomorrow Night Blue Theme Configuration
export const theme = {
  colors: {
    // Background colors - Tomorrow Night Blue palette
    bg: {
      primary: '#002451',      // Deep blue background
      secondary: '#001733',    // Darker blue
      tertiary: '#00346e',     // Lighter blue
      card: 'rgba(0, 52, 110, 0.5)',
      hover: 'rgba(0, 52, 110, 0.8)',
      glass: 'rgba(0, 36, 81, 0.7)',
    },
    
    // Text colors
    text: {
      primary: '#ffffff',
      secondary: '#7aa6da',    // Light blue
      tertiary: '#99c794',     // Green
      muted: '#5a7ca7',
      accent: '#6699cc',       // Accent blue
      warning: '#f9ae58',      // Orange
      error: '#f97b58',        // Red
      success: '#99c794',      // Green
    },
    
    // UI colors
    ui: {
      border: 'rgba(122, 166, 218, 0.2)',
      borderHover: 'rgba(122, 166, 218, 0.4)',
      shadow: 'rgba(0, 0, 0, 0.5)',
      glow: '#7aa6da',
      accent: '#6699cc',
      highlight: '#bbdaff',
    },
    
    // Component specific colors
    components: {
      node: {
        default: '#003f88',
        hover: '#0051a8',
        selected: '#006fd8',
        running: '#5394ec',
        success: '#99c794',
        error: '#f97b58',
        warning: '#f9ae58',
      },
      edge: {
        default: 'rgba(122, 166, 218, 0.4)',
        hover: 'rgba(122, 166, 218, 0.8)',
        selected: '#bbdaff',
        animated: '#6699cc',
      }
    },
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #002451 0%, #003f88 100%)',
      secondary: 'linear-gradient(135deg, #001733 0%, #002451 100%)',
      glass: 'linear-gradient(135deg, rgba(0, 36, 81, 0.8) 0%, rgba(0, 52, 110, 0.4) 100%)',
      glow: 'radial-gradient(circle, rgba(122, 166, 218, 0.4) 0%, transparent 70%)',
      accent: 'linear-gradient(135deg, #6699cc 0%, #7aa6da 100%)',
    }
  },
  
  // Spacing system
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  
  // Border radius
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(122, 166, 218, 0.5)',
    glowLg: '0 0 40px rgba(122, 166, 218, 0.6)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
    spring: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Animations
  animations: {
    fadeIn: 'fadeIn 0.3s ease-in-out',
    slideIn: 'slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    pulse: 'pulse 2s infinite',
    glow: 'glow 2s ease-in-out infinite alternate',
    float: 'float 3s ease-in-out infinite',
    shimmer: 'shimmer 2s linear infinite',
  }
};

// Glassmorphism utilities
export const glassmorphism = {
  light: `
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `,
  medium: `
    background: rgba(0, 52, 110, 0.3);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(122, 166, 218, 0.2);
  `,
  dark: `
    background: rgba(0, 23, 51, 0.5);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(122, 166, 218, 0.15);
  `,
};

// Neon glow effects
export const neonGlow = {
  blue: `
    text-shadow: 
      0 0 10px #7aa6da,
      0 0 20px #7aa6da,
      0 0 30px #7aa6da,
      0 0 40px #6699cc;
  `,
  green: `
    text-shadow: 
      0 0 10px #99c794,
      0 0 20px #99c794,
      0 0 30px #99c794,
      0 0 40px #81b88b;
  `,
  orange: `
    text-shadow: 
      0 0 10px #f9ae58,
      0 0 20px #f9ae58,
      0 0 30px #f9ae58,
      0 0 40px #f99e38;
  `,
};