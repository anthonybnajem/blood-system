import { getDB, settingsApi, type AppSettings, type ReceiptSettings } from "./db";

export type BrowserMaintenanceExport = {
  appSettings: AppSettings;
  receiptSettings: ReceiptSettings;
  exportDate: string;
  version: string;
};

export async function exportBrowserMaintenanceData(): Promise<BrowserMaintenanceExport> {
  try {
    const appSettings = await settingsApi.getAppSettings();
    const receiptSettings = await settingsApi.getReceiptSettings();

    return {
      appSettings,
      receiptSettings,
      exportDate: new Date().toISOString(),
      version: "lab-dashboard-browser-v1",
    };
  } catch (error) {
    console.error("Error exporting browser maintenance data:", error);
    throw new Error("Failed to export browser settings");
  }
}

export async function importBrowserMaintenanceData(
  data: BrowserMaintenanceExport | File
): Promise<void> {
  try {
    let importData: BrowserMaintenanceExport;

    if (data instanceof File) {
      const text = await data.text();
      importData = JSON.parse(text);
    } else {
      importData = data;
    }

    if (!importData.version || !importData.appSettings) {
      throw new Error("Invalid import data format");
    }

    await settingsApi.saveAppSettings(importData.appSettings);

    if (importData.receiptSettings) {
      await settingsApi.saveReceiptSettings(importData.receiptSettings);
    }
  } catch (error) {
    console.error("Error importing browser maintenance data:", error);
    throw new Error("Failed to import browser settings");
  }
}

export async function getBrowserMaintenanceStats() {
  const db = getDB();
  const [settingsCount, employeesCount, customersCount] = await Promise.all([
    db.settings.count(),
    db.employees.count().catch(() => 0),
    db.customers.count().catch(() => 0),
  ]);

  return {
    settings: settingsCount,
    employees: employeesCount,
    customers: customersCount,
  };
}
