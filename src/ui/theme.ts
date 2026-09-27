import { UI_THEMES } from '../config/palette';
import type { ThemeName } from '../config/schema';

/** Aplica el tema elegido cambiando las variables CSS de la página. */
export function applyTheme(theme: ThemeName, root: HTMLElement = document.documentElement): void {
  const t = UI_THEMES[theme];
  root.style.setProperty('--ui-bg', t.background);
  root.style.setProperty('--ui-panel', t.panel);
  root.style.setProperty('--ui-text', t.text);
  root.style.setProperty('--ui-primary', t.primary);
  root.style.setProperty('--ui-secondary', t.secondary);
  root.style.setProperty('--ui-accent', t.accent);
}
