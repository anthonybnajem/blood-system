export type DesktopUpdateStatus =
  | "unavailable"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "error";

export type DesktopUpdateState = {
  supported: boolean;
  configured: boolean;
  status: DesktopUpdateStatus;
  message: string;
  currentVersion: string;
  availableVersion: string | null;
  downloadedVersion: string | null;
  progressPercent: number | null;
};

const DEFAULT_UPDATE_STATE: DesktopUpdateState = {
  supported: false,
  configured: false,
  status: "unavailable",
  message: "Desktop updates are unavailable.",
  currentVersion: "1.0.0",
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: null,
};

// Utility functions for Electron compatibility

declare global {
  interface Window {
    electronAPI?: {
      isElectron: () => Promise<boolean>;
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      openPrintPreview: (payload: {
        html: string;
        title?: string;
        baseUrl?: string;
      }) => Promise<boolean>;
      getUpdateState: () => Promise<DesktopUpdateState>;
      checkForUpdates: () => Promise<DesktopUpdateState>;
      downloadUpdate: () => Promise<DesktopUpdateState>;
      quitAndInstallUpdate: () => Promise<boolean>;
      getUninstallInfo: () => Promise<DesktopUninstallInfo>;
      launchUninstaller: () => Promise<boolean>;
      onUpdateState: (
        listener: (state: DesktopUpdateState) => void
      ) => (() => void) | undefined;
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
  if (typeof window === "undefined" || !window.electronAPI) {
    return { hasUpdate: false };
  }

  const state = await window.electronAPI.checkForUpdates();
  return {
    hasUpdate: state.status === "available" || state.status === "downloaded",
    version: state.availableVersion ?? state.downloadedVersion ?? undefined,
  };
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

export const openDesktopPrintPreview = async (payload: {
  html: string;
  title?: string;
  baseUrl?: string;
}): Promise<boolean> => {
  if (typeof window === "undefined" || !window.electronAPI?.openPrintPreview) {
    return false;
  }

  try {
    return await window.electronAPI.openPrintPreview(payload);
  } catch (error) {
    console.error("Failed to open Electron print preview:", error);
    return false;
  }
};

export const getDesktopUpdateState = async (): Promise<DesktopUpdateState> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    return DEFAULT_UPDATE_STATE;
  }

  try {
    const state = await window.electronAPI.getUpdateState();
    return {
      ...state,
      currentVersion: state.currentVersion || getAppVersion(),
    };
  } catch (error) {
    console.error("Failed to read desktop update state:", error);
    return DEFAULT_UPDATE_STATE;
  }
};

export const downloadDesktopUpdate = async (): Promise<DesktopUpdateState> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    return DEFAULT_UPDATE_STATE;
  }

  return window.electronAPI.downloadUpdate();
};

export const installDesktopUpdate = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !window.electronAPI) {
    return false;
  }

  return window.electronAPI.quitAndInstallUpdate();
};

export const subscribeToDesktopUpdateState = (
  listener: (state: DesktopUpdateState) => void
): (() => void) => {
  if (typeof window === "undefined" || !window.electronAPI?.onUpdateState) {
    return () => {};
  }

  return window.electronAPI.onUpdateState(listener) || (() => {});
};

export type DesktopUninstallInfo = {
  supported: boolean;
  platform: string;
  userDataPath: string;
  dataPath: string;
  uninstallPath: string | null;
};

const DEFAULT_UNINSTALL_INFO: DesktopUninstallInfo = {
  supported: false,
  platform: "unknown",
  userDataPath: "",
  dataPath: "",
  uninstallPath: null,
};

export const getDesktopUninstallInfo = async (): Promise<DesktopUninstallInfo> => {
  if (typeof window === "undefined" || !window.electronAPI?.getUninstallInfo) {
    return DEFAULT_UNINSTALL_INFO;
  }

  try {
    return await window.electronAPI.getUninstallInfo();
  } catch (error) {
    console.error("Failed to read desktop uninstall info:", error);
    return DEFAULT_UNINSTALL_INFO;
  }
};

export const launchDesktopUninstaller = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !window.electronAPI?.launchUninstaller) {
    return false;
  }

  try {
    return await window.electronAPI.launchUninstaller();
  } catch (error) {
    console.error("Failed to launch desktop uninstaller:", error);
    return false;
  }
};
