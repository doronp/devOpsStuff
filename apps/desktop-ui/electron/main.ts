import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';

// __dirname and __filename are available in CommonJS

let mainWindow: BrowserWindow | null = null;

/**
 * Create the main browser window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Don't show until ready
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * IPC Handlers
 */

// Select folders for indexing
ipcMain.handle('dialog:selectFolders', async () => {
  if (!mainWindow) {
    return { canceled: true, filePaths: [] };
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections'],
    title: 'Select Image Folders',
    message: 'Choose folders containing images to index',
  });

  return result;
});

// Open folder in system file manager
ipcMain.handle('shell:openFolder', async (_, folderPath: string) => {
  const { shell } = await import('electron');
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    console.error('Failed to open folder:', error);
    return { success: false, error: String(error) };
  }
});

// Open image in system default viewer
ipcMain.handle('shell:openImage', async (_, imagePath: string) => {
  const { shell } = await import('electron');
  try {
    await shell.openPath(imagePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to open image:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
