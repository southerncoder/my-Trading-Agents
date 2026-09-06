import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeName } from '../themes';

export const ThemeSelector: React.FC = () => {
  const { themeName, setTheme, availableThemes } = useTheme();

  const themeDisplayNames: Record<ThemeName, string> = {
    southerncoding: 'Southern Coding',
    paper: 'Paper CSS',
    material: 'Material Design',
  };

  return (
    <div className="theme-selector">
      <label htmlFor="theme-select" className="block text-sm font-medium mb-2">
        Theme
      </label>
      <select
        id="theme-select"
        value={themeName}
        onChange={(e) => setTheme(e.target.value as ThemeName)}
        className="input-field"
      >
        {availableThemes.map((theme) => (
          <option key={theme} value={theme}>
            {themeDisplayNames[theme]}
          </option>
        ))}
      </select>
    </div>
  );
};