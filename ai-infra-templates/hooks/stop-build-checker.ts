/**
 * stop-build-checker Hook - Run Build/Lint Checks After Changes
 *
 * This hook runs AFTER Claude finishes a response.
 * It checks which files were edited (using edit-log.json) and runs
 * appropriate build/lint commands for the affected repos.
 *
 * Installation:
 * 1. Copy to .claude/hooks/stop-build-checker.ts
 * 2. Requires postToolUse-edit-tracker.ts to be installed
 * 3. Customize REPO_COMMANDS to match your project structure
 *
 * Customization:
 * - Modify REPO_COMMANDS to define build/lint commands for your repos
 * - Adjust ERROR_THRESHOLD to change when to suggest manual fixes
 * - Set ENABLED = false to disable (or rename file)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { getModifiedRepos, getSessionEdits, clearSessionEdits } from './postToolUse-edit-tracker';

const execAsync = promisify(exec);

// =============================================================================
// Configuration
// =============================================================================

const ENABLED = true; // Set to false to disable this hook
const ERROR_THRESHOLD = 5; // Show summary if >= this many errors
const TIMEOUT_MS = 30000; // 30 second timeout for commands

// Define commands for each repo/app
interface RepoCommands {
  name: string;
  path: string; // Relative to project root
  commands: {
    name: string;
    command: string;
    description: string;
  }[];
}

const REPO_COMMANDS: RepoCommands[] = [
  {
    name: 'desktop-ui',
    path: 'apps/desktop-ui',
    commands: [
      {
        name: 'type-check',
        command: 'pnpm tsc --noEmit',
        description: 'TypeScript type checking'
      },
      {
        name: 'lint',
        command: 'pnpm eslint src electron --ext .ts,.tsx --max-warnings 0',
        description: 'ESLint'
      }
    ]
  },
  {
    name: 'clip-backend',
    path: 'apps/clip-backend',
    commands: [
      {
        name: 'type-check',
        command: 'mypy src',
        description: 'MyPy type checking'
      },
      {
        name: 'lint',
        command: 'ruff check src',
        description: 'Ruff linting'
      }
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
    // Get modified repos from edit tracker
    const modifiedRepos = getModifiedRepos(context.workingDirectory);

    if (modifiedRepos.length === 0) {
      // No edits in this session
      return '';
    }

    // Run checks for each modified repo
    const results: CheckResult[] = [];

    for (const repoName of modifiedRepos) {
      const repoConfig = REPO_COMMANDS.find(r => r.name === repoName);

      if (!repoConfig) {
        console.warn(`[stop-build-checker] No commands configured for repo: ${repoName}`);
        continue;
      }

      const repoResults = await runRepoChecks(
        context.workingDirectory,
        repoConfig
      );

      results.push(...repoResults);
    }

    // Clear session edits (checks are done)
    clearSessionEdits(context.workingDirectory);

    // Format output
    if (results.length === 0) {
      return '';
    }

    return formatResults(results);

  } catch (error) {
    console.error('[stop-build-checker] Error:', error);
    return '';
  }
}

// =============================================================================
// Core Logic
// =============================================================================

interface CheckResult {
  repo: string;
  checkName: string;
  description: string;
  passed: boolean;
  output?: string;
  errorCount?: number;
}

async function runRepoChecks(
  workingDir: string,
  repoConfig: RepoCommands
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const repoPath = path.join(workingDir, repoConfig.path);

  for (const cmd of repoConfig.commands) {
    try {
      const { stdout, stderr } = await execAsync(cmd.command, {
        cwd: repoPath,
        timeout: TIMEOUT_MS
      });

      // Command succeeded
      results.push({
        repo: repoConfig.name,
        checkName: cmd.name,
        description: cmd.description,
        passed: true
      });

    } catch (error: any) {
      // Command failed
      const output = error.stdout || error.stderr || error.message;
      const errorCount = countErrors(output);

      results.push({
        repo: repoConfig.name,
        checkName: cmd.name,
        description: cmd.description,
        passed: false,
        output,
        errorCount
      });
    }
  }

  return results;
}

function countErrors(output: string): number {
  // Simple error counting (lines with "error" or that look like error messages)
  const lines = output.split('\n');
  let count = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('error') ||
      lower.match(/^\s*\d+:\d+\s+error/) || // ESLint format
      lower.match(/^error:/) || // Python format
      lower.match(/^\s*✖/) // Check mark errors
    ) {
      count++;
    }
  }

  return count;
}

function formatResults(results: CheckResult[]): string {
  const failed = results.filter(r => !r.passed);

  if (failed.length === 0) {
    // All checks passed
    const lines = [
      '',
      '✅ BUILD CHECKS PASSED',
      ''
    ];

    for (const result of results) {
      lines.push(`  ✓ ${result.repo}/${result.checkName}: ${result.description}`);
    }

    return lines.join('\n');
  }

  // Some checks failed
  const lines = [
    '',
    '⚠️  BUILD CHECKS FAILED',
    ''
  ];

  for (const result of failed) {
    lines.push(`  ✗ ${result.repo}/${result.checkName}: ${result.description}`);

    if (result.errorCount && result.errorCount >= ERROR_THRESHOLD) {
      // Too many errors, show summary
      lines.push(`    ${result.errorCount} errors found`);
      lines.push(`    Run manually to see details: cd ${result.repo} && check ${result.checkName}`);
    } else {
      // Show actual errors
      if (result.output) {
        const errorLines = result.output
          .split('\n')
          .filter(line => {
            const lower = line.toLowerCase();
            return lower.includes('error') || lower.includes('✖');
          })
          .slice(0, 10); // Max 10 error lines

        for (const errorLine of errorLines) {
          lines.push(`    ${errorLine.trim()}`);
        }
      }
    }

    lines.push('');
  }

  lines.push('💡 Please fix these errors before proceeding.');

  return lines.join('\n');
}

// =============================================================================
// Export
// =============================================================================

export default stop;
