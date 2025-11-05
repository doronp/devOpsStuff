/**
 * postToolUse-edit-tracker Hook - Track File Modifications
 *
 * This hook runs AFTER Edit, Write, or MultiEdit tool calls.
 * It records which files were modified so that stop hooks can:
 * - Run appropriate build/lint checks
 * - Show relevant reminders
 * - Format modified files
 *
 * Installation:
 * 1. Copy to .claude/hooks/postToolUse-edit-tracker.ts
 * 2. Hook will automatically run after edit operations
 * 3. Creates .claude/edit-log.json to track edits
 *
 * Customization:
 * - Adjust MAX_LOG_ENTRIES to keep more/fewer history entries
 * - Modify getRepoFromPath() to match your project structure
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Configuration
// =============================================================================

const EDIT_LOG_PATH = '.claude/edit-log.json';
const MAX_LOG_ENTRIES = 100; // Keep last 100 edits

// =============================================================================
// Types
// =============================================================================

interface EditEntry {
  timestamp: string;
  filePath: string;
  toolName: string;
  repo?: string; // Which repo/app (e.g., 'desktop-ui', 'clip-backend')
  fileType?: string; // Extension (e.g., '.ts', '.py')
}

interface EditLog {
  entries: EditEntry[];
  sessionEdits: EditEntry[]; // Edits in current response
}

// =============================================================================
// Main Hook Function
// =============================================================================

export async function postToolUse(
  toolName: string,
  toolInput: any,
  toolOutput: any,
  context: { workingDirectory: string }
): Promise<void> {
  // Only track edit-related tools
  if (!isEditTool(toolName)) {
    return;
  }

  try {
    const filePaths = extractFilePaths(toolName, toolInput);

    if (filePaths.length === 0) {
      return;
    }

    // Load existing log
    const editLog = loadEditLog(context.workingDirectory);

    // Record new edits
    for (const filePath of filePaths) {
      const entry: EditEntry = {
        timestamp: new Date().toISOString(),
        filePath,
        toolName,
        repo: getRepoFromPath(filePath),
        fileType: path.extname(filePath)
      };

      editLog.entries.push(entry);
      editLog.sessionEdits.push(entry);
    }

    // Trim old entries
    if (editLog.entries.length > MAX_LOG_ENTRIES) {
      editLog.entries = editLog.entries.slice(-MAX_LOG_ENTRIES);
    }

    // Save log
    saveEditLog(context.workingDirectory, editLog);

  } catch (error) {
    console.error('[postToolUse-edit-tracker] Error:', error);
  }
}

// =============================================================================
// Core Logic
// =============================================================================

function isEditTool(toolName: string): boolean {
  const editTools = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];
  return editTools.includes(toolName);
}

function extractFilePaths(toolName: string, toolInput: any): string[] {
  const paths: string[] = [];

  if (!toolInput) {
    return paths;
  }

  // Handle different tool input structures
  if (toolInput.file_path) {
    paths.push(toolInput.file_path);
  }

  if (toolInput.notebook_path) {
    paths.push(toolInput.notebook_path);
  }

  if (toolInput.edits && Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (edit.file_path) {
        paths.push(edit.file_path);
      }
    }
  }

  return paths;
}

function getRepoFromPath(filePath: string): string | undefined {
  // Extract repo/app name from path
  // Customize this based on your project structure

  const normalized = filePath.replace(/\\/g, '/');

  // Match common patterns:
  // - apps/desktop-ui/...
  // - apps/clip-backend/...
  // - packages/shared/...

  const appsMatch = normalized.match(/apps\/([^\/]+)\//);
  if (appsMatch) {
    return appsMatch[1];
  }

  const packagesMatch = normalized.match(/packages\/([^\/]+)\//);
  if (packagesMatch) {
    return packagesMatch[1];
  }

  // Check for src/ directory patterns
  if (normalized.includes('/src/')) {
    // Try to get parent directory name
    const parts = normalized.split('/');
    const srcIndex = parts.indexOf('src');
    if (srcIndex > 0) {
      return parts[srcIndex - 1];
    }
  }

  return undefined;
}

function loadEditLog(workingDir: string): EditLog {
  const logPath = path.join(workingDir, EDIT_LOG_PATH);

  // Ensure .claude directory exists
  const claudeDir = path.join(workingDir, '.claude');
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  if (!fs.existsSync(logPath)) {
    return { entries: [], sessionEdits: [] };
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const data = JSON.parse(content);

    // Start new session (clear sessionEdits)
    return {
      entries: data.entries || [],
      sessionEdits: []
    };
  } catch (error) {
    console.warn('[postToolUse-edit-tracker] Failed to parse edit log, creating new one');
    return { entries: [], sessionEdits: [] };
  }
}

function saveEditLog(workingDir: string, editLog: EditLog): void {
  const logPath = path.join(workingDir, EDIT_LOG_PATH);

  try {
    fs.writeFileSync(logPath, JSON.stringify(editLog, null, 2), 'utf-8');
  } catch (error) {
    console.error('[postToolUse-edit-tracker] Failed to save edit log:', error);
  }
}

// =============================================================================
// Utility Functions for Stop Hooks
// =============================================================================

/**
 * Helper function for stop hooks to read session edits
 */
export function getSessionEdits(workingDir: string): EditEntry[] {
  const logPath = path.join(workingDir, EDIT_LOG_PATH);

  if (!fs.existsSync(logPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const data = JSON.parse(content);
    return data.sessionEdits || [];
  } catch {
    return [];
  }
}

/**
 * Helper to get unique repos/apps modified in this session
 */
export function getModifiedRepos(workingDir: string): string[] {
  const edits = getSessionEdits(workingDir);
  const repos = new Set<string>();

  for (const edit of edits) {
    if (edit.repo) {
      repos.add(edit.repo);
    }
  }

  return Array.from(repos);
}

/**
 * Helper to get files by type
 */
export function getEditedFilesByType(workingDir: string, extensions: string[]): string[] {
  const edits = getSessionEdits(workingDir);
  const files = new Set<string>();

  for (const edit of edits) {
    if (edit.fileType && extensions.includes(edit.fileType)) {
      files.add(edit.filePath);
    }
  }

  return Array.from(files);
}

/**
 * Clear session edits (call at end of stop hooks)
 */
export function clearSessionEdits(workingDir: string): void {
  const logPath = path.join(workingDir, EDIT_LOG_PATH);

  if (!fs.existsSync(logPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(logPath, 'utf-8');
    const data = JSON.parse(content);
    data.sessionEdits = [];
    fs.writeFileSync(logPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[postToolUse-edit-tracker] Failed to clear session edits:', error);
  }
}

// =============================================================================
// Export
// =============================================================================

export default postToolUse;
