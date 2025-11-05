# CLAUDE.md – {{PROJECT_NAME}}

This is the main entrypoint for Claude Code AI assistance in this project.

## How to Adapt This Template for a New Project

1. Copy this file to your project root as `CLAUDE.md`
2. Replace all `{{PROJECT_NAME}}` placeholders with your actual project name
3. Replace `{{SERVICE_NAME}}` with your service/app name where applicable
4. Update the "Repo layout" section to match your actual structure
5. Customize the "Skills used" section to reference your active skills
6. Update links to project-specific documentation

---

## Critical Rules for All Projects

### 1. ALWAYS Read Before Editing or Writing
- NEVER use Edit or Write tools without first reading the file with the Read tool
- This ensures you understand existing code and avoid conflicts
- Exception: Completely new files that don't exist yet

### 2. Task Management with Todos
- Use TodoWrite tool for any non-trivial task (≥3 steps)
- Mark tasks as in_progress BEFORE starting work
- Mark completed IMMEDIATELY after finishing
- Only ONE task should be in_progress at a time

### 3. Error Handling & Testing
- Always handle errors in:
  - File I/O operations
  - Network requests
  - Model loading and inference
  - External API calls
- Write tests for core functionality
- Run lints and builds before considering work complete

### 4. Communication Style
- Be concise and direct
- No unnecessary emojis (unless explicitly requested)
- Use markdown for formatting
- Include file paths with line numbers for references (e.g., `src/main.py:42`)

---

## Dev Docs Workflow

This project uses a structured dev-docs approach for planning and tracking work:

### Structure

```
dev/
  active/
    <feature-name>/
      <feature-name>-plan.md      # High-level plan and approach
      <feature-name>-context.md   # Key files, dependencies, constraints
      <feature-name>-tasks.md     # Detailed checklist
  templates/
    new-feature-template/         # Template for new features
```

### When to Create Dev Docs

Create new dev docs for:
- Features requiring 5+ files to be modified
- New system components or modules
- Architectural changes
- Complex refactorings

### How to Use Dev Docs

1. **Planning Phase**: Create plan.md outlining approach and design decisions
2. **Context Gathering**: Create context.md with key files, dependencies, and constraints
3. **Task Breakdown**: Create tasks.md with detailed, actionable checklist
4. **During Implementation**:
   - Reference context.md to stay oriented
   - Check off tasks.md items as you complete them
   - Update plan.md if approach changes
5. **After Completion**: Move to `dev/completed/` or archive

---

## Skills & Hooks Overview

### What Are Skills?

Skills are domain-specific guidance documents that help Claude Code understand:
- Project conventions and patterns
- Best practices for specific domains (frontend, backend, testing, etc.)
- Common pitfalls to avoid
- File structure and organization

### Skills Used in This Project

Located in: `.claude/skills/` (or reference `ai-infra-templates/skills/` for templates)

- **project-setup-guidelines**: How to set up dev docs, skills, and hooks
- **frontend-desktop-guidelines**: Electron + React + TypeScript patterns
- **backend-ml-guidelines**: ML service patterns, API design, model management
- **skill-developer**: Meta-skill for creating new skills

### How Skills Get Activated

Skills are automatically suggested via:
1. **Hooks**: The `userPromptSubmit.ts` hook reads `skill-rules.json` and matches:
   - File path patterns (e.g., editing `apps/desktop-ui/**/*.tsx` → frontend skill)
   - Keywords in prompts (e.g., "React", "Electron", "backend API")
   - Intent patterns (e.g., "create new component" → frontend skill)

2. **Manual activation**: You can explicitly ask Claude to use a skill:
   ```
   "Use the backend-ml-guidelines skill to help me..."
   ```

### What Are Hooks?

Hooks are TypeScript functions that run at specific points in the Claude Code workflow:

- **userPromptSubmit** (pre-prompt): Analyzes prompt and suggests relevant skills
- **postToolUse** (after tool execution): Tracks edits, logs changes
- **stop** (after response): Runs checks, formatters, reminders

Located in: `.claude/hooks/` (or `ai-infra-templates/hooks/` for templates)

Active hooks in this project:
- `userPromptSubmit.ts`: Skill activation based on context
- `postToolUse-edit-tracker.ts`: Logs all file edits
- `stop-build-checker.ts`: Runs build/lint checks after responses
- `stop-error-handling-reminder.ts`: Reminds about error handling patterns

---

## Repo Layout Quick Reference

```
{{PROJECT_NAME}}/
  ai-infra-templates/          # Reusable templates for skills, hooks, docs
    CLAUDE.base.md             # This template
    skills/                    # Skill templates
    hooks/                     # Hook templates
    skill-rules.json           # Skill activation rules template

  apps/
    {{SERVICE_NAME}}/          # Main application code

  docs/
    PROJECT_KNOWLEDGE.md       # Project overview, goals, non-goals
    ARCHITECTURE.md            # System architecture and design
    API_*.md                   # API documentation

  dev/
    active/                    # Current feature work
    templates/                 # Templates for new features
    completed/                 # Archived completed work (optional)

  scripts/                     # Build, deploy, utility scripts

  CLAUDE.md                    # This file (project root)
  README.md                    # Project README for humans
```

---

## How to Start a New Feature

### 1. Enter Planning Mode (Optional but Recommended for Complex Features)

For features requiring significant design work:

```
"Let's plan out how to implement <feature>"
```

Claude will work with you to:
- Understand requirements
- Design the approach
- Identify dependencies and constraints

### 2. Create Dev Docs

```
"Create dev docs for <feature-name> in dev/active/<feature-name>/"
```

Claude will create:
- `<feature-name>-plan.md`
- `<feature-name>-context.md`
- `<feature-name>-tasks.md`

Or copy from template:

```bash
cp -r dev/templates/new-feature-template dev/active/<feature-name>
```

### 3. Implement with Todo Tracking

Ask Claude to implement using the task list:

```
"Implement <feature> following the plan in dev/active/<feature-name>/"
```

Claude will:
- Create TodoWrite checklist from tasks.md
- Mark tasks in_progress as work proceeds
- Reference context.md for key files
- Update todos as tasks complete

### 4. Review & Test

```
"Review the implementation and run all tests"
```

Hooks will automatically:
- Run build checks (via stop-build-checker)
- Remind about error handling (via stop-error-handling-reminder)

---

## Common Workflows

### Starting Work on Existing Code

1. **Explore the codebase**:
   ```
   "Show me the structure of the {{SERVICE_NAME}} module"
   "Where is <functionality> implemented?"
   ```

2. **Read relevant docs**:
   - Check `docs/PROJECT_KNOWLEDGE.md` for context
   - Check `docs/ARCHITECTURE.md` for system design
   - Look for existing dev docs in `dev/active/`

3. **Make changes**:
   - Claude will automatically suggest relevant skills
   - Create todos for multi-step changes
   - Run tests/builds via hooks

### Adding a New Component/Module

1. **Plan it out**:
   ```
   "I want to add a <component>. Help me plan the structure."
   ```

2. **Create dev docs** (for complex additions):
   ```
   "Create dev docs for <component-name>"
   ```

3. **Implement**:
   ```
   "Implement <component> following the plan"
   ```

### Debugging & Troubleshooting

1. **Describe the issue**:
   ```
   "The <feature> is failing with <error>. Help me debug."
   ```

2. **Claude will**:
   - Search for relevant code
   - Analyze error patterns
   - Suggest fixes with error handling

### Refactoring

1. **Describe the refactor**:
   ```
   "Refactor <module> to use <pattern>"
   ```

2. **Review the plan**:
   - Claude creates todos for multi-step refactors
   - Identifies affected files

3. **Implement incrementally**:
   - One component at a time
   - Run tests after each step

---

## Project-Specific Context

### Key Documentation

- **Project Overview**: `docs/PROJECT_KNOWLEDGE.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **API Specs**: `docs/API_*.md`

### Key Directories

- **{{PRIMARY_CODE_DIR}}**: Main application code
- **{{TESTS_DIR}}**: Test suites
- **{{CONFIG_DIR}}**: Configuration files

### Key Technologies

- **{{TECH_STACK}}**: List main technologies, frameworks, libraries
  - Example: Node.js, TypeScript, React, Electron
  - Example: Python, FastAPI, PyTorch, FAISS

### Build & Run Commands

- **Install dependencies**: `{{INSTALL_CMD}}`
  - Example: `pnpm install`
  - Example: `pip install -r requirements.txt`

- **Development**: `{{DEV_CMD}}`
  - Example: `pnpm dev`
  - Example: `python -m uvicorn src.main:app --reload`

- **Build**: `{{BUILD_CMD}}`
  - Example: `pnpm build`
  - Example: `python -m build`

- **Test**: `{{TEST_CMD}}`
  - Example: `pnpm test`
  - Example: `pytest`

- **Lint**: `{{LINT_CMD}}`
  - Example: `pnpm lint`
  - Example: `ruff check .`

---

## Getting Help

- **Ask Claude**: Describe what you're trying to do
- **Reference docs**: Point Claude to relevant docs
- **Use skills**: Explicitly activate skills for domain-specific help
- **Check hooks**: If builds/checks fail, review `.claude/hooks/` configuration

---

## Notes for Future Maintainers

### Customizing Skills

Skills are in `.claude/skills/` (or `ai-infra-templates/skills/` for templates).

To modify a skill:
1. Read the skill's `main.md` and `resources/*.md`
2. Edit to match your project's conventions
3. Update `skill-rules.json` if you change when it should activate

### Customizing Hooks

Hooks are in `.claude/hooks/` (or `ai-infra-templates/hooks/` for templates).

To modify a hook:
1. Edit the TypeScript file
2. Test thoroughly (hooks run automatically!)
3. Consider adding a disable flag for optional hooks

### Adding New Dev Doc Templates

1. Create a new directory in `dev/templates/`
2. Add `*-plan.md`, `*-context.md`, `*-tasks.md` templates
3. Include placeholder text and instructions
4. Reference in this doc under "How to Start a New Feature"

---

**Last Updated**: {{DATE}}
**Template Version**: 1.0.0
