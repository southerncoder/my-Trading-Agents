export interface Theme {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    bull: string;
    bear: string;
    neutral: string;
    border: string;
    shadow: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export type ThemeName = 'southerncoding' | 'paper' | 'material';

export const themes: Record<ThemeName, Theme> = {
  southerncoding: {
    name: 'southerncoding',
    displayName: 'Southern Coding',
    colors: {
      primary: '#7dd3fc',
      secondary: '#8b5cf6',
      accent: '#ff0080',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
      surface: 'rgba(15, 23, 42, 0.9)',
      text: {
        primary: '#f1f5f9',
        secondary: '#e2e8f0',
        muted: '#94a3b8',
      },
      bull: '#00ff88',
      bear: '#ff0080',
      neutral: '#94a3b8',
      border: '#334155',
      shadow: 'rgba(125, 211, 252, 0.15)',
    },
    fonts: {
      primary: 'Inter, system-ui, sans-serif',
      secondary: '"Fira Code", monospace',
      mono: '"Press Start 2P", monospace',
    },
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
    },
    borderRadius: {
      sm: '0.375rem',
      md: '0.5rem',
      lg: '0.75rem',
    },
    shadows: {
      sm: '0 0 5px currentColor',
      md: '0 4px 14px 0 rgba(125, 211, 252, 0.15)',
      lg: '0 8px 25px 0 rgba(125, 211, 252, 0.25)',
    },
  },
  
  paper: {
    name: 'paper',
    displayName: 'Paper CSS',
    colors: {
      primary: '#41403e',
      secondary: '#f3f3f3',
      accent: '#d32f2f',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: {
        primary: '#212121',
        secondary: '#424242',
        muted: '#757575',
      },
      bull: '#4caf50',
      bear: '#f44336',
      neutral: '#9e9e9e',
      border: '#e0e0e0',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
    fonts: {
      primary: '"Nunito Sans", sans-serif',
      secondary: '"Courier New", monospace',
      mono: '"Courier New", monospace',
    },
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
    },
    borderRadius: {
      sm: '2px',
      md: '4px',
      lg: '8px',
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 25px rgba(0, 0, 0, 0.15)',
    },
  },
  
  material: {
    name: 'material',
    displayName: 'Material Design',
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      accent: '#ff5722',
      background: '#fafafa',
      surface: '#ffffff',
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
        muted: 'rgba(0, 0, 0, 0.38)',
      },
      bull: '#4caf50',
      bear: '#f44336',
      neutral: '#9e9e9e',
      border: 'rgba(0, 0, 0, 0.12)',
      shadow: 'rgba(0, 0, 0, 0.2)',
    },
    fonts: {
      primary: '"Roboto", sans-serif',
      secondary: '"Roboto Mono", monospace',
      mono: '"Roboto Mono", monospace',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      md: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
      lg: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    },
  },
};

export const getTheme = (themeName: ThemeName): Theme => {
  return themes[themeName];
};

export const getThemeNames = (): ThemeName[] => {
  return Object.keys(themes) as ThemeName[];
};