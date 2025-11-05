# CLAUDE.md – OpenCLIP Desktop Image Search

This is the main entrypoint for Claude Code AI assistance in this project.

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

Located in: `ai-infra-templates/skills/` (templates, copy to `.claude/skills/` to activate)

- **project-setup-guidelines**: How to set up dev docs, skills, and hooks
- **frontend-desktop-guidelines**: Electron + React + TypeScript patterns
- **backend-ml-guidelines**: ML service patterns, API design, model management

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

Located in: `ai-infra-templates/hooks/` (templates, copy to `.claude/hooks/` to activate)

Available hooks:
- `userPromptSubmit.ts`: Skill activation based on context
- `postToolUse-edit-tracker.ts`: Logs all file edits
- `stop-build-checker.ts`: Runs build/lint checks after responses
- `stop-error-handling-reminder.ts`: Reminds about error handling patterns
- `stop-prettier-formatter.ts.DISABLED`: Code formatter (disabled by default)

---

## Repo Layout Quick Reference

```
openclip-desktop/
  ai-infra-templates/          # Reusable templates for skills, hooks, docs
    CLAUDE.base.md             # Template for CLAUDE.md
    skills/                    # Skill templates
    hooks/                     # Hook templates
    skill-rules.json           # Skill activation rules template

  apps/
    desktop-ui/                # Electron + React frontend
    clip-backend/              # Python + FastAPI backend

  docs/
    PROJECT_KNOWLEDGE.md       # Project overview, goals, non-goals
    ARCHITECTURE.md            # System architecture and design
    API_BACKEND.md             # Backend API documentation
    UI_FLOWS.md                # UI screens and flows

  dev/
    active/                    # Current feature work
    templates/                 # Templates for new features

  scripts/                     # Build, deploy, utility scripts

  CLAUDE.md                    # This file
  README.md                    # Project README
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
   "Show me the structure of the backend/frontend"
   "Where is the indexing logic implemented?"
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
   "The search feature is failing with <error>. Help me debug."
   ```

2. **Claude will**:
   - Search for relevant code
   - Analyze error patterns
   - Suggest fixes with error handling

### Refactoring

1. **Describe the refactor**:
   ```
   "Refactor the indexing service to use batch processing"
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
- **Backend API**: `docs/API_BACKEND.md`
- **UI Flows**: `docs/UI_FLOWS.md`

### Key Directories

**Frontend**:
- `apps/desktop-ui/electron/`: Electron main process
- `apps/desktop-ui/src/`: React renderer
  - `src/screens/`: Top-level UI screens
  - `src/components/`: Reusable components
  - `src/api/`: Backend API client

**Backend**:
- `apps/clip-backend/src/`: Python backend
  - `src/models/`: OpenCLIP and FAISS wrappers
  - `src/api.py`: FastAPI endpoints
  - `src/services/`: Business logic
  - `src/schemas/`: Pydantic models

### Key Technologies

**Frontend**:
- Electron (desktop framework)
- React (UI library)
- TypeScript (type-safe JavaScript)
- Vite (build tool)
- Vitest (testing)

**Backend**:
- Python 3.9+
- FastAPI (API framework)
- OpenCLIP (vision-language model)
- PyTorch (deep learning)
- FAISS (similarity search)
- Uvicorn (ASGI server)

### Build & Run Commands

**Frontend** (from `apps/desktop-ui/`):
- Install: `pnpm install`
- Dev (Vite): `pnpm dev`
- Dev (Electron): `pnpm electron:dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Type check: `pnpm type-check`

**Backend** (from `apps/clip-backend/`):
- Install: `pip install -r requirements.txt` or `pip install -e ".[dev]"`
- Dev: `uvicorn src.main:app --reload`
- Test: `pytest`
- Lint: `ruff check src`
- Type check: `mypy src`

---

## Getting Help

- **Ask Claude**: Describe what you're trying to do
- **Reference docs**: Point Claude to relevant docs
- **Use skills**: Explicitly activate skills for domain-specific help
- **Check hooks**: If builds/checks fail, review hook configurations

---

## Notes for Future Maintainers

### Activating Skills and Hooks

The `ai-infra-templates/` directory contains templates. To activate:

1. **Copy skills to `.claude/skills/`**:
   ```bash
   mkdir -p .claude/skills
   cp -r ai-infra-templates/skills/* .claude/skills/
   ```

2. **Copy hooks to `.claude/hooks/`**:
   ```bash
   mkdir -p .claude/hooks
   cp -r ai-infra-templates/hooks/* .claude/hooks/
   ```

3. **Copy skill rules**:
   ```bash
   cp ai-infra-templates/skill-rules.json .claude/skill-rules.json
   ```

4. **Customize paths** in `.claude/skill-rules.json` if your directory structure differs.

### Customizing Skills

Skills are in `.claude/skills/` (after copying from templates).

To modify a skill:
1. Read the skill's `main.md` and `resources/*.md`
2. Edit to match your project's conventions
3. Update `.claude/skill-rules.json` if you change when it should activate

### Customizing Hooks

Hooks are in `.claude/hooks/` (after copying from templates).

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

**Last Updated**: 2025-11-05
**Project Version**: 1.0.0
