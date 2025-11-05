import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script that exposes a safe, limited API to the renderer process
 * via the context bridge. This maintains security while enabling IPC.
 */

export interface ElectronAPI {
  // Dialog operations
  selectFolders: () => Promise<{ canceled: boolean; filePaths: string[] }>;

  // Shell operations
  openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  openImage: (imagePath: string) => Promise<{ success: boolean; error?: string }>;
}

const electronAPI: ElectronAPI = {
  selectFolders: () => ipcRenderer.invoke('dialog:selectFolders'),
  openFolder: (folderPath: string) => ipcRenderer.invoke('shell:openFolder', folderPath),
  openImage: (imagePath: string) => ipcRenderer.invoke('shell:openImage', imagePath),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
