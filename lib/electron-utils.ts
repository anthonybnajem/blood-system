// Utility functions for Electron compatibility

declare global {
  interface Window {
    electronAPI?: {
      isElectron: () => Promise<boolean>;
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
    };
  }
}

// Check if running in Electron environment
export const isElectron = (): boolean => {
  if (typeof window === "undefined") return false;
  if (typeof window.electronAPI !== "undefined") return true;
  if (typeof navigator !== "undefined") {
    return navigator.userAgent.toLowerCase().includes(" electron/");
  }
  return false;
};

// Generate a unique device ID for license activation
export const getDeviceId = (): string => {
  if (typeof window !== "undefined" && window.localStorage) {
    let deviceId = localStorage.getItem("pos_device_id");
    if (!deviceId) {
      deviceId = `DEVICE-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("pos_device_id", deviceId);
    }
    return deviceId;
  }
  return "unknown-device";
};

// Get app version for UI display.
export const getAppVersion = (): string => {
  if (typeof window !== "undefined" && window.localStorage) {
    const cachedVersion = window.localStorage.getItem("app_version");
    if (cachedVersion) return cachedVersion;
  }
  return "1.0.0";
};

export const refreshAppVersion = async (): Promise<string> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    return getAppVersion();
  }

  try {
    const version = await window.electronAPI.getVersion();
    window.localStorage.setItem("app_version", version);
    return version;
  } catch (error) {
    console.error("Failed to read Electron app version:", error);
    return getAppVersion();
  }
};

// Check if app needs update
export const checkForUpdates = async (): Promise<{
  hasUpdate: boolean;
  version?: string;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { hasUpdate: false };
};

// Simulate saving app settings to electron-store
export const saveSettings = (settings: Record<string, any>): void => {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("pos_app_settings", JSON.stringify(settings));
  }
};

// Simulate loading app settings from electron-store
export const loadSettings = (): Record<string, any> => {
  if (typeof window !== "undefined" && window.localStorage) {
    const settings = localStorage.getItem("pos_app_settings");
    return settings ? JSON.parse(settings) : {};
  }
  return {};
};

// Simulate opening external links in default browser
export const openExternalLink = (url: string): void => {
  if (typeof window === "undefined") return;

  if (window.electronAPI) {
    void window.electronAPI.openExternal(url);
    return;
  }

  window.open(url, "_blank");
};
