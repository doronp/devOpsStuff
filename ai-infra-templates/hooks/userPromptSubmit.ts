/**
 * userPromptSubmit Hook - Skill Activation Suggester
 *
 * This hook runs BEFORE Claude processes the user's prompt.
 * It analyzes the prompt and active file context to suggest relevant skills.
 *
 * Installation:
 * 1. Copy to .claude/hooks/userPromptSubmit.ts
 * 2. Ensure skill-rules.json exists in .claude/skill-rules.json
 * 3. Hook will automatically run on every user prompt
 *
 * Customization:
 * - Modify skill-rules.json to adjust trigger patterns
 * - Change SUGGESTION_FORMAT to customize output format
 * - Adjust MAX_SUGGESTIONS to show more/fewer suggestions
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Configuration
// =============================================================================

const SKILL_RULES_PATH = '.claude/skill-rules.json';
const MAX_SUGGESTIONS = 3;
const SUGGESTION_FORMAT = 'block'; // 'block' or 'inline'

// =============================================================================
// Types
// =============================================================================

interface SkillRule {
  name: string;
  type: 'domain' | 'meta' | 'utility';
  description: string;
  enforcement: 'suggest' | 'require' | 'auto';
  priority: 'high' | 'normal' | 'low';
  promptTriggers?: {
    keywords?: string[];
    intentPatterns?: string[];
  };
  fileTriggers?: {
    pathPatterns?: string[];
    contentPatterns?: string[];
  };
}

interface SkillRules {
  skills: SkillRule[];
  globalRules?: {
    maxActiveSuggestions?: number;
    suggestionFormat?: string;
    includeReason?: boolean;
  };
}

interface SkillSuggestion {
  skill: string;
  reason: string;
  priority: number;
  source: 'prompt' | 'file-path' | 'file-content';
}

// =============================================================================
// Main Hook Function
// =============================================================================

export async function userPromptSubmit(
  promptText: string,
  context: { activeFilePath?: string; workingDirectory: string }
): Promise<string> {
  try {
    // Load skill rules
    const skillRules = loadSkillRules(context.workingDirectory);
    if (!skillRules) {
      return promptText; // No modification if rules not found
    }

    // Analyze prompt and context
    const suggestions = analyzeAndSuggest(
      promptText,
      context.activeFilePath,
      context.workingDirectory,
      skillRules
    );

    // If no suggestions, return original prompt
    if (suggestions.length === 0) {
      return promptText;
    }

    // Format and prepend suggestions
    const suggestionBlock = formatSuggestions(suggestions, skillRules);
    return `${suggestionBlock}\n\n${promptText}`;

  } catch (error) {
    console.error('[userPromptSubmit] Error:', error);
    return promptText; // Return original prompt on error
  }
}

// =============================================================================
// Core Logic
// =============================================================================

function loadSkillRules(workingDir: string): SkillRules | null {
  const rulesPath = path.join(workingDir, SKILL_RULES_PATH);

  if (!fs.existsSync(rulesPath)) {
    console.warn(`[userPromptSubmit] Skill rules not found at ${rulesPath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(rulesPath, 'utf-8');
    return JSON.parse(content) as SkillRules;
  } catch (error) {
    console.error(`[userPromptSubmit] Failed to parse skill rules:`, error);
    return null;
  }
}

function analyzeAndSuggest(
  promptText: string,
  activeFilePath: string | undefined,
  workingDir: string,
  skillRules: SkillRules
): SkillSuggestion[] {
  const suggestions: SkillSuggestion[] = [];
  const promptLower = promptText.toLowerCase();

  for (const skill of skillRules.skills) {
    // Check prompt triggers (keywords)
    if (skill.promptTriggers?.keywords) {
      for (const keyword of skill.promptTriggers.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          suggestions.push({
            skill: skill.name,
            reason: `prompt mentions "${keyword}"`,
            priority: getPriorityValue(skill.priority),
            source: 'prompt'
          });
          break; // One match per skill is enough
        }
      }
    }

    // Check prompt triggers (intent patterns)
    if (skill.promptTriggers?.intentPatterns) {
      for (const pattern of skill.promptTriggers.intentPatterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(promptText)) {
            suggestions.push({
              skill: skill.name,
              reason: `prompt intent matches "${pattern}"`,
              priority: getPriorityValue(skill.priority),
              source: 'prompt'
            });
            break;
          }
        } catch (e) {
          console.warn(`[userPromptSubmit] Invalid regex pattern: ${pattern}`);
        }
      }
    }

    // Check file path triggers
    if (activeFilePath && skill.fileTriggers?.pathPatterns) {
      const relativePath = path.relative(workingDir, activeFilePath);

      for (const pattern of skill.fileTriggers.pathPatterns) {
        if (matchGlobPattern(relativePath, pattern)) {
          suggestions.push({
            skill: skill.name,
            reason: `editing file matching "${pattern}"`,
            priority: getPriorityValue(skill.priority),
            source: 'file-path'
          });
          break;
        }
      }
    }

    // Check file content triggers (optional, can be expensive)
    // if (activeFilePath && skill.fileTriggers?.contentPatterns) {
    //   const content = tryReadFile(activeFilePath);
    //   if (content) {
    //     for (const pattern of skill.fileTriggers.contentPatterns) {
    //       try {
    //         const regex = new RegExp(pattern, 'i');
    //         if (regex.test(content)) {
    //           suggestions.push({
    //             skill: skill.name,
    //             reason: `file contains pattern "${pattern}"`,
    //             priority: getPriorityValue(skill.priority),
    //             source: 'file-content'
    //           });
    //           break;
    //         }
    //       } catch (e) {
    //         console.warn(`[userPromptSubmit] Invalid regex pattern: ${pattern}`);
    //       }
    //     }
    //   }
    // }
  }

  // Deduplicate by skill name (keep highest priority)
  const deduped = deduplicateSuggestions(suggestions);

  // Sort by priority (high to low)
  deduped.sort((a, b) => b.priority - a.priority);

  // Limit to MAX_SUGGESTIONS
  const maxSuggestions = skillRules.globalRules?.maxActiveSuggestions || MAX_SUGGESTIONS;
  return deduped.slice(0, maxSuggestions);
}

function deduplicateSuggestions(suggestions: SkillSuggestion[]): SkillSuggestion[] {
  const seen = new Map<string, SkillSuggestion>();

  for (const suggestion of suggestions) {
    const existing = seen.get(suggestion.skill);
    if (!existing || suggestion.priority > existing.priority) {
      seen.set(suggestion.skill, suggestion);
    }
  }

  return Array.from(seen.values());
}

function formatSuggestions(suggestions: SkillSuggestion[], skillRules: SkillRules): string {
  const includeReason = skillRules.globalRules?.includeReason ?? true;

  if (SUGGESTION_FORMAT === 'inline') {
    // Compact inline format
    const skillList = suggestions.map(s => s.skill).join(', ');
    return `💡 Suggested skills: ${skillList}`;
  }

  // Block format (default)
  const lines = [
    '🎯 SKILL ACTIVATION SUGGESTIONS',
    ''
  ];

  for (const suggestion of suggestions) {
    if (includeReason) {
      lines.push(`- **${suggestion.skill}** (${suggestion.reason})`);
    } else {
      lines.push(`- ${suggestion.skill}`);
    }
  }

  return lines.join('\n');
}

// =============================================================================
// Utility Functions
// =============================================================================

function getPriorityValue(priority: string): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'normal':
      return 2;
    case 'low':
      return 1;
    default:
      return 2;
  }
}

function matchGlobPattern(filePath: string, pattern: string): boolean {
  // Simple glob matching (supports * and **)
  // For production, consider using a library like 'micromatch'

  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.') // Escape dots
    .replace(/\*\*/g, '___DOUBLESTAR___') // Temporarily replace **
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/___DOUBLESTAR___/g, '.*') // ** matches anything including /
    .replace(/\{([^}]+)\}/g, '($1)') // {a,b,c} -> (a|b|c)
    .replace(/,/g, '|'); // Convert commas to OR

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

function tryReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// =============================================================================
// Export
// =============================================================================

export default userPromptSubmit;
