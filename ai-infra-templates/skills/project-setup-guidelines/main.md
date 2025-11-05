# Project Setup Guidelines

**Skill Type**: Meta-skill for project organization and development workflow

**When to Use This Skill**:
- Setting up a new project
- Creating dev docs for a new feature
- Understanding the skills and hooks system
- Organizing project structure

**Auto-Activation Triggers**:
- Editing root-level docs (CLAUDE.md, PROJECT_KNOWLEDGE.md, ARCHITECTURE.md)
- Keywords: "setup", "dev docs", "skills", "hooks", "project structure"
- Intent patterns: "create dev docs", "set up project", "organize feature"

---

## Overview

This skill guides you through the development workflow using:
- **Dev docs**: Structured planning and context documents
- **Skills**: Domain-specific guidance that auto-activates
- **Hooks**: Automation at key workflow points
- **Todo tracking**: Managing multi-step tasks

---

## Dev Docs System

### Purpose

Dev docs provide a consistent structure for planning and tracking work:

1. **plan.md**: High-level approach and design decisions
2. **context.md**: Key files, dependencies, constraints, gotchas
3. **tasks.md**: Detailed, actionable checklist

### When to Create Dev Docs

Create dev docs for:
- Features requiring 5+ files to be modified
- New system components or modules
- Architectural changes
- Complex refactorings
- Any multi-day work

Skip dev docs for:
- Simple bug fixes (1-2 files)
- Trivial changes
- Documentation-only updates

### Directory Structure

```
dev/
  active/                    # Current work
    feature-name/
      feature-name-plan.md
      feature-name-context.md
      feature-name-tasks.md

  templates/                 # Templates for new features
    new-feature-template/
      feature-plan.template.md
      feature-context.template.md
      feature-tasks.template.md

  completed/                 # Archived (optional)
    old-feature/
```

---

## Creating Dev Docs

### Step 1: Create Directory

```bash
mkdir -p dev/active/my-new-feature
```

### Step 2: Create plan.md

`dev/active/my-new-feature/my-new-feature-plan.md`:

```markdown
# My New Feature - Plan

## Goal

What are we trying to achieve?

## Approach

High-level approach:
1. Step 1
2. Step 2
3. Step 3

## Design Decisions

Key decisions and rationale:
- **Decision 1**: Rationale
- **Decision 2**: Rationale

## Non-Goals

What we're explicitly NOT doing:
- Out of scope item 1
- Out of scope item 2

## Success Criteria

How do we know it's complete?
- [ ] Criterion 1
- [ ] Criterion 2
```

### Step 3: Create context.md

`dev/active/my-new-feature/my-new-feature-context.md`:

```markdown
# My New Feature - Context

## Key Files

Files that will be modified or are relevant:

**Frontend**:
- `src/components/NewComponent.tsx` - Main component
- `src/api/client.ts` - API calls

**Backend**:
- `src/api.py` - New endpoints
- `src/services/new_service.py` - Business logic

## Dependencies

External dependencies needed:
- New npm package: `some-library@^2.0.0`
- Python package: `some-package>=1.0.0`

## Constraints

Technical constraints or limitations:
- Must support Python 3.9+
- Cannot use Feature X due to Y

## Related Work

Links to:
- Related issues/PRs
- Design docs
- External references
```

### Step 3: Create tasks.md

`dev/active/my-new-feature/my-new-feature-tasks.md`:

```markdown
# My New Feature - Tasks

## Backend

- [ ] Create data models in `models/new_model.py`
- [ ] Implement business logic in `services/new_service.py`
- [ ] Add API endpoints in `api.py`
- [ ] Write unit tests for service
- [ ] Write API integration tests

## Frontend

- [ ] Create `NewComponent.tsx`
- [ ] Add API client methods in `client.ts`
- [ ] Wire component to API
- [ ] Add component tests
- [ ] Update UI to include new component

## Integration

- [ ] End-to-end test with both frontend and backend
- [ ] Manual testing
- [ ] Update documentation

## Polish

- [ ] Error handling complete
- [ ] Loading states work
- [ ] Logs are informative
- [ ] No console errors/warnings
```

---

## Using Dev Docs During Development

### 1. Reference Context

When working on the feature:

```
"I'm implementing the new search feature. Check dev/active/search-feature/search-feature-context.md
for key files and constraints."
```

Claude will:
- Read the context doc
- Understand which files to modify
- Respect constraints
- Use the right dependencies

### 2. Track Tasks with Todos

```
"Implement the search feature following dev/active/search-feature/search-feature-tasks.md"
```

Claude will:
- Create TodoWrite checklist from tasks.md
- Mark tasks as in_progress while working
- Mark completed immediately after finishing
- Stay organized across multiple files

### 3. Update Plan as Needed

If approach changes:

```
"We need to change the approach for X. Update the plan doc."
```

---

## Skills System

### What Are Skills?

Skills are domain-specific guidance documents stored in `.claude/skills/` (or `ai-infra-templates/skills/` for templates).

Each skill has:
- **main.md**: Core guidance (< 500 lines)
- **resources/*.md**: Detailed sub-topics

### Available Skills (for this project)

1. **frontend-desktop-guidelines**: Electron + React + TypeScript
   - Structure, state management, IPC, UX patterns

2. **backend-ml-guidelines**: Python + FastAPI + OpenCLIP
   - API design, model loading, indexing, search

3. **project-setup-guidelines**: This skill
   - Dev docs, skills, hooks, project organization

### How Skills Activate

Skills auto-activate based on:
- **File paths**: Editing files matching patterns
- **Keywords**: Prompts containing trigger words
- **Intent**: What you're trying to do

Configured in `skill-rules.json`.

### Manual Activation

You can explicitly activate a skill:

```
"Use the backend-ml-guidelines skill to help me implement the search API"
```

---

## Hooks System

### What Are Hooks?

Hooks are TypeScript functions that run at specific workflow points:

1. **userPromptSubmit** (before prompt): Suggest skills, add context
2. **postToolUse** (after tool): Track edits, log changes
3. **stop** (after response): Run checks, format code, show reminders

### Available Hooks (for this project)

1. **userPromptSubmit.ts**: Suggests relevant skills based on context
2. **postToolUse-edit-tracker.ts**: Logs all file edits
3. **stop-build-checker.ts**: Runs build/lint after changes
4. **stop-error-handling-reminder.ts**: Reminds about error handling patterns
5. **stop-prettier-formatter.ts**: (Disabled) Formats code

### Hook Behavior

Hooks run automatically. You'll see:

```
🎯 SKILL ACTIVATION SUGGESTIONS
- backend-ml-guidelines (reason: editing apps/clip-backend/)
```

Or after making changes:

```
📋 ERROR HANDLING SELF-CHECK
- Are file I/O errors handled?
- Are API errors returned clearly?
```

---

## Project Scripts

### Common Scripts

Should be defined in `package.json` (frontend) or `pyproject.toml` / `Makefile` (backend):

**Frontend**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

**Backend**:
```toml
# In pyproject.toml or as Makefile
[tool.poe.tasks]
dev = "uvicorn src.main:app --reload"
test = "pytest"
lint = "ruff check src"
type-check = "mypy src"
```

### Running Scripts

```bash
# Frontend
pnpm dev
pnpm build
pnpm test

# Backend
python -m uvicorn src.main:app --reload
pytest
ruff check src
```

---

## Mono-repo Structure (Optional)

If using a mono-repo:

### Setup

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Running Commands

```bash
# Run in specific workspace
pnpm --filter desktop-ui dev
pnpm --filter clip-backend test

# Run in all workspaces
pnpm -r build
pnpm -r test
```

---

## Workflow Example

### Starting a New Feature

1. **Create dev docs**:
   ```bash
   mkdir -p dev/active/image-filtering
   # Create plan, context, tasks files
   ```

2. **Tell Claude**:
   ```
   "I want to add image filtering by date. I've created dev docs in
   dev/active/image-filtering/. Let's start with the backend."
   ```

3. **Claude will**:
   - Read dev docs
   - Auto-activate backend-ml-guidelines skill
   - Create TodoWrite checklist from tasks
   - Start implementation

4. **During development**:
   - Hooks suggest relevant skills
   - Edit tracker logs changes
   - Build checker runs after changes

5. **When complete**:
   - All tasks marked complete
   - Tests pass
   - Docs updated

---

## Creating Reusable Templates

### Feature Template

In `dev/templates/new-feature-template/`:

**feature-plan.template.md**:
```markdown
# {{FEATURE_NAME}} - Plan

## Goal
[Describe what this feature does]

## Approach
1. [Step 1]
2. [Step 2]

## Design Decisions
- **[Decision]**: [Rationale]

## Success Criteria
- [ ] [Criterion 1]
```

### Using Template

```bash
# Copy template
cp -r dev/templates/new-feature-template dev/active/my-feature

# Replace placeholders
sed -i 's/{{FEATURE_NAME}}/My Feature/g' dev/active/my-feature/*
```

Or ask Claude:

```
"Create new dev docs for 'advanced search' feature using the template"
```

---

## Best Practices

### Dev Docs

1. **Keep updated**: Update plan if approach changes
2. **Be specific**: Name exact files and functions in context
3. **Track everything**: All tasks in tasks.md
4. **Archive when done**: Move to completed/ or delete

### Skills

1. **Trust auto-activation**: Let hooks suggest skills
2. **Manual when needed**: Explicitly activate if not suggested
3. **Keep focused**: Each skill for one domain

### Hooks

1. **Don't disable without reason**: They catch issues early
2. **Fix, don't ignore**: If hook shows errors, fix them
3. **Customize carefully**: Test thoroughly

### Todos

1. **Use for multi-step work**: Not for single trivial tasks
2. **Mark complete immediately**: Don't batch completions
3. **One in_progress**: Focus on current task
4. **Update as you go**: Add tasks discovered during work

---

## Checklist for New Projects

When setting up a new project with this system:

- [ ] Copy `ai-infra-templates/` to new project
- [ ] Customize `CLAUDE.base.md` → `CLAUDE.md` with project info
- [ ] Adjust skills for project-specific patterns
- [ ] Configure `skill-rules.json` with correct paths/keywords
- [ ] Install hooks in `.claude/hooks/`
- [ ] Create `dev/` directory structure
- [ ] Create feature templates in `dev/templates/`
- [ ] Document project-specific conventions

---

## Additional Resources

### Documentation Files

- **PROJECT_KNOWLEDGE.md**: Project overview, goals, tech stack
- **ARCHITECTURE.md**: System design, component relationships
- **API_*.md**: API specifications

### External Resources

- Claude Code docs: https://docs.claude.com/
- FastAPI docs: https://fastapi.tiangolo.com/
- React docs: https://react.dev/

---

**Last Updated**: 2025-11-05
**Skill Version**: 1.0.0
