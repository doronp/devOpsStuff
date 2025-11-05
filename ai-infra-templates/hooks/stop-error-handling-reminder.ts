/**
 * stop-error-handling-reminder Hook - Remind About Error Handling
 *
 * This hook runs AFTER Claude finishes a response.
 * It analyzes edited files and shows context-specific reminders about
 * error handling patterns that should be applied.
 *
 * Installation:
 * 1. Copy to .claude/hooks/stop-error-handling-reminder.ts
 * 2. Requires postToolUse-edit-tracker.ts to be installed
 * 3. Customize ERROR_PATTERNS to match your coding patterns
 *
 * Customization:
 * - Modify ERROR_PATTERNS to add/remove patterns
 * - Adjust which file types trigger which reminders
 * - Set ENABLED = false to disable
 */

import * as fs from 'fs';
import { getEditedFilesByType, getSessionEdits } from './postToolUse-edit-tracker';

// =============================================================================
// Configuration
// =============================================================================

const ENABLED = true;

// Define error handling patterns to check for
interface ErrorPattern {
  name: string;
  fileTypes: string[]; // File extensions (e.g., ['.ts', '.tsx'])
  keywords: string[]; // Keywords that indicate this pattern applies
  reminders: string[]; // Questions to ask
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    name: 'API/Network Calls',
    fileTypes: ['.ts', '.tsx', '.js', '.jsx'],
    keywords: ['fetch', 'axios', 'api', 'http', 'request'],
    reminders: [
      'Are network errors caught and handled gracefully?',
      'Are loading states shown to the user?',
      'Are error messages user-friendly?',
      'Is there a retry mechanism if appropriate?'
    ]
  },
  {
    name: 'File I/O Operations',
    fileTypes: ['.ts', '.tsx', '.py'],
    keywords: ['readFile', 'writeFile', 'open(', 'fs.', 'Path'],
    reminders: [
      'Are file not found errors handled?',
      'Are permission errors caught?',
      'Are file paths validated before use?',
      'Is the operation logged for debugging?'
    ]
  },
  {
    name: 'Backend API Endpoints',
    fileTypes: ['.py'],
    keywords: ['@app.', '@router.', 'async def', 'FastAPI', 'HTTPException'],
    reminders: [
      'Do endpoints return appropriate HTTP status codes?',
      'Are Pydantic validation errors handled?',
      'Are internal errors caught and logged?',
      'Are error responses in consistent format?'
    ]
  },
  {
    name: 'Model/ML Operations',
    fileTypes: ['.py'],
    keywords: ['model.', 'torch.', 'embed', 'predict', 'inference'],
    reminders: [
      'Are model loading errors handled?',
      'Are out-of-memory errors caught?',
      'Are invalid inputs validated before processing?',
      'Is model device (CPU/GPU) handled correctly?'
    ]
  },
  {
    name: 'Database Operations',
    fileTypes: ['.py', '.ts', '.tsx'],
    keywords: ['query', 'INSERT', 'UPDATE', 'DELETE', 'SELECT', 'db.'],
    reminders: [
      'Are connection errors handled?',
      'Are transactions rolled back on error?',
      'Are SQL injection risks mitigated?',
      'Are constraint violations caught?'
    ]
  },
  {
    name: 'User Input Validation',
    fileTypes: ['.ts', '.tsx', '.py'],
    keywords: ['input', 'form', 'validate', 'schema', 'Pydantic'],
    reminders: [
      'Is user input validated before use?',
      'Are validation errors shown clearly to user?',
      'Is sanitization applied where needed?',
      'Are edge cases (empty, null, extreme values) handled?'
    ]
  },
  {
    name: 'Async Operations',
    fileTypes: ['.ts', '.tsx', '.py'],
    keywords: ['async', 'await', 'Promise', 'asyncio'],
    reminders: [
      'Are promise rejections/exceptions caught?',
      'Are race conditions prevented?',
      'Is cancellation supported where appropriate?',
      'Are timeouts implemented for long operations?'
    ]
  }
];

// =============================================================================
// Main Hook Function
// =============================================================================

export async function stop(context: { workingDirectory: string }): Promise<string> {
  if (!ENABLED) {
    return '';
  }

  try {
    const edits = getSessionEdits(context.workingDirectory);

    if (edits.length === 0) {
      return '';
    }

    // Analyze each edited file
    const applicablePatterns = new Set<ErrorPattern>();

    for (const edit of edits) {
      if (!edit.fileType) continue;

      // Read file content
      const content = tryReadFile(edit.filePath);
      if (!content) continue;

      // Check which patterns apply
      for (const pattern of ERROR_PATTERNS) {
        if (!pattern.fileTypes.includes(edit.fileType)) {
          continue;
        }

        // Check if any keywords are in the file
        const contentLower = content.toLowerCase();
        const hasKeyword = pattern.keywords.some(keyword =>
          contentLower.includes(keyword.toLowerCase())
        );

        if (hasKeyword) {
          applicablePatterns.add(pattern);
        }
      }
    }

    if (applicablePatterns.size === 0) {
      return '';
    }

    // Format reminders
    return formatReminders(Array.from(applicablePatterns));

  } catch (error) {
    console.error('[stop-error-handling-reminder] Error:', error);
    return '';
  }
}

// =============================================================================
// Core Logic
// =============================================================================

function tryReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function formatReminders(patterns: ErrorPattern[]): string {
  const lines = [
    '',
    '📋 ERROR HANDLING SELF-CHECK',
    '',
    'Please verify the following for the code you just wrote:',
    ''
  ];

  for (const pattern of patterns) {
    lines.push(`**${pattern.name}**:`);

    for (const reminder of pattern.reminders) {
      lines.push(`  - ${reminder}`);
    }

    lines.push('');
  }

  lines.push('💡 If any of these are not handled, please add appropriate error handling.');

  return lines.join('\n');
}

// =============================================================================
// Export
// =============================================================================

export default stop;
