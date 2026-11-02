# Theme System

The TradingAgents web frontend supports multiple themes to provide different visual experiences.

## Available Themes

### 1. Southern Coding (Default)
- **Style**: Futuristic cyber aesthetic inspired by southerncoding.dev
- **Colors**: Electric blue, cyber purple, neon accents
- **Fonts**: Press Start 2P (headers), Fira Code (code), Inter (body)
- **Features**: Neon glows, matrix effects, cyber animations

### 2. Paper CSS
- **Style**: Hand-drawn, sketchy design inspired by getpapercss.com
- **Colors**: Warm grays, natural tones, subtle accents
- **Fonts**: Nunito Sans (body), Courier Prime (mono)
- **Features**: Hand-drawn borders, paper texture, sketchy animations

### 3. Material Design
- **Style**: Google's Material Design 3 principles
- **Colors**: Clean blues, structured grays, systematic palette
- **Fonts**: Roboto (body), Roboto Mono (code)
- **Features**: Elevation shadows, ripple effects, smooth transitions

## Usage

### Theme Context
```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, themeName, setTheme } = useTheme();
  
  return (
    <div style={{ color: theme.colors.primary }}>
      Current theme: {theme.displayName}
    </div>
  );
}
```

### CSS Variables
All themes use CSS custom properties that are automatically applied:

```css
.my-component {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
  font-family: var(--font-primary);
}
```

### Theme-Aware Classes
Use these classes for consistent theming:

- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style
- `.card` - Card container
- `.input-field` - Form input styling
- `.bull-text` - Positive/bullish text color
- `.bear-text` - Negative/bearish text color
- `.neutral-text` - Neutral text color

## Adding New Themes

1. **Define theme object** in `themes/index.ts`
2. **Create CSS file** in `themes/[theme-name].css`
3. **Import CSS** in `index.css`
4. **Add to theme list** in ThemeContext

### Theme Object Structure
```typescript
{
  name: 'my-theme',
  displayName: 'My Theme',
  colors: {
    primary: '#color',
    secondary: '#color',
    // ... other colors
  },
  fonts: {
    primary: 'Font Family',
    // ... other fonts
  },
  // ... other properties
}
```

## Best Practices

1. **Use CSS variables** instead of hardcoded colors
2. **Test all themes** when adding new components
3. **Maintain accessibility** across all themes
4. **Keep consistent spacing** using theme variables
5. **Use semantic color names** (primary, secondary, etc.)

## Theme Switching

Users can switch themes using the theme selector in the header. The selected theme is persisted in localStorage and automatically applied on page load.