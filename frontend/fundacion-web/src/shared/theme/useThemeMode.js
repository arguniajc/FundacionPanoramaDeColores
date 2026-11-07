import { createContext, useContext } from 'react';

export const ThemeCtx = createContext({ mode: 'light', toggleMode: () => {} });
export const useThemeMode = () => useContext(ThemeCtx);
