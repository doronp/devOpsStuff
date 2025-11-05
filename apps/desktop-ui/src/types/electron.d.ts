/**
 * TypeScript type definitions for the Electron API exposed via preload script
 */

export interface ElectronAPI {
  // Dialog operations
  selectFolders: () => Promise<{ canceled: boolean; filePaths: string[] }>;

  // Shell operations
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  openImage: (imagePath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
