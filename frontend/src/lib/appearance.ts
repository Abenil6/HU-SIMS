import type { AppearanceSettings } from "@/types/user";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  darkMode: false,
  colorTheme: "green",
  fontSize: "medium",
  density: "comfortable",
  borderRadius: "medium",
  sidebarCollapsed: false,
  showAnimations: true,
};

export const normalizeAppearanceSettings = (
  appearance?: Partial<AppearanceSettings> | null,
): AppearanceSettings => ({
  ...DEFAULT_APPEARANCE,
  ...(appearance || {}),
});
