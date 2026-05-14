# Next.js (App Router) Project Architecture and Structure Rules

This document defines the source of truth for the folder structure, design patterns, and architectural rules of the project. All developers and AI agents must strictly adhere to these rules before writing or modifying code.

---

# 1. Core Principles

## Exclusive App Router

Use the Next.js App Router (`src/app`).

The Pages Router is **not used**.

---

## Server Components by Default

Every component is a **Server Component** unless it requires interactivity (`useState`, `useEffect`, DOM events, browser APIs, etc.).

If interactivity is required, the component must include:

```tsx
"use client";
```

as the **first line** of the file.

---

## Container/Presenter Pattern

There must be a strict separation between:

- **Business logic** → Containers
- **UI rendering** → Presenters / Components

---

## Routing vs. Logic

The `app/` directory is strictly for defining routes.

Business logic and visual components must live outside of `app/`.

---

# 2. Global Folder Structure (`src/`)

```txt
src/
├── app/            # STRICTLY FOR ROUTING
├── components/     # Global, reusable, and atomic components
├── layouts/        # Global structural templates
├── sections/       # Logic and views grouped by domain/module
├── server/         # Pure backend logic
└── libs/           # Utilities, integrations, and global configs
```

---

# Rules per Global Directory

## `src/app/`

It is **FORBIDDEN** to place:

- UI components
- Hooks
- Business logic

This directory should only contain Next.js convention files:

```txt
page.tsx
layout.tsx
loading.tsx
error.tsx
route.ts
```

Pages (`page.tsx`) should only import and render a **Container** from `sections/`.

---

## `src/components/`

### `ui/`

Purely visual atomic components:

- Buttons
- Inputs
- Modals
- shadcn/ui wrappers

### `commons/`

General reusable components shared across multiple domains.

### `icons/`

SVG icon components.

---

## `src/layouts/`

Components that define the macro structure of the application.

Examples:

- Navbar
- Footer
- Sidebar
- DashboardShell

---

## `src/libs/`

Contains:

- Pure utility functions
- Formatters
- Configured external libraries
- SDK initializations

---

## `src/server/`

Contains code that executes **only on the server**.

### `database/`

- Database connection
- Schemas
- ORM setup
- Migrations

### `services/`

Contains:

- Heavy business logic
- Direct DB queries
- External API integrations

---

# 3. Modular Architecture (`src/sections/`) — THE HEART OF THE APP

To avoid spaghetti code, each feature or main route must be encapsulated inside a dedicated section.

Each section behaves like an isolated micro-module.

---

# Example Structure

## `src/sections/posts/New/`

```txt
src/sections/posts/New/
├── actions/
│   └── savePost.action.ts
├── components/
│   ├── PostForm.tsx
│   └── PostToolbar.tsx
├── container/
│   └── NewPostContainer.tsx
├── hooks/
│   └── usePostForm.ts
└── types/
    └── newPost.types.ts
```

---

# Rules Within a Section

## `container/` — The Brain

Responsibilities:

- Main entry point exported to `app/`
- State management
- `react-hook-form`
- Async fetching and mutations
- Calling Server Actions
- Orchestrating UI components

Restrictions:

- Must not contain complex styles
- Must not contain extensive HTML markup
- Must focus on orchestration only

---

## `components/` — The Presenters

Responsibilities:

- Pure UI rendering
- Receive props
- Render markup
- Emit callbacks

Restrictions:

- Zero business logic
- No direct data fetching
- No mutation logic

---

## `actions/` — The Backend Bridge

Rules:

- File suffix must be `.action.ts`
- Must contain:

```tsx
"use server";
```

Responsibilities:

- Data mutations
- Session/security validation
- Calling backend services
- Returning typed responses

---

# 4. Rendering Patterns (Server vs Client)

## Server Components by Default

Everything in:

- `components/`
- `layouts/`
- `app/`

should initially be created as a **Server Component**.

---

## Client Boundaries

Containers requiring:

- State
- Effects
- Browser APIs
- Forms
- Interactivity

must use:

```tsx
"use client";
```

---

## Server Component Injection (Composition Pattern)

### NEVER do this:

```tsx
"use client";

import ServerComponent from "./ServerComponent";
```

### Correct approach:

Pass the Server Component through `children`.

---

# 5. Naming Conventions

## React Components (`.tsx`)

Use PascalCase:

```txt
UserProfile.tsx
PostToolbar.tsx
```

---

## Routing Files

Only Next.js reserved lowercase names:

```txt
page.tsx
layout.tsx
loading.tsx
error.tsx
route.ts
```

---

## Hooks (`.ts`)

Use camelCase prefixed with `use`:

```txt
useDataPipeline.ts
usePostForm.ts
```

---

## Server Actions (`.ts`)

Use camelCase with `.action.ts` suffix:

```txt
savePost.action.ts
processData.action.ts
```

---

## Services / Utilities (`.ts`)

Use camelCase:

```txt
dateFormatter.ts
postService.ts
```

---

## Types / Interfaces (`.ts`)

Use camelCase with `.types.ts` suffix:

```txt
user.types.ts
newPost.types.ts
```

---

# 6. Standard Data Flow (Practical Example)

1. `app/posts/new/page.tsx`
   - Defines the route
   - Renders `<NewPostContainer />`

2. `sections/posts/New/container/NewPostContainer.tsx`
   - Initializes hooks/state
   - Handles mutations
   - Calls server actions
   - Coordinates UI

3. `sections/posts/New/components/PostForm.tsx`
   - Renders form fields
   - Receives callbacks via props
   - Notifies interactions

4. `sections/posts/New/actions/savePost.action.ts`
   - Validates security/session
   - Receives payload
   - Calls services

5. `server/services/postService.ts`
   - Database interaction
   - Heavy business logic
   - External APIs

---

# 7. Architectural Rules Summary

## DO

- Keep `app/` clean and route-only
- Use Server Components by default
- Isolate business logic in containers/services
- Keep UI components pure
- Organize features by section/domain
- Use Server Actions for mutations
- Maintain strict separation of concerns

---

## DO NOT

- Put business logic inside UI components
- Put hooks or state logic in `app/`
- Fetch directly inside presentational components
- Mix server/client responsibilities
- Create giant shared folders with unrelated code
- Import Server Components directly into Client Components

---

# 8. Golden Rule

> `app/` defines routes  
> `sections/` defines features  
> `components/` defines reusable UI  
> `server/` defines backend logic  
> `libs/` defines utilities
