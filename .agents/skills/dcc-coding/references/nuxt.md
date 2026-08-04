---
outline: deep
description: Coding standards and best practices for Nuxt.js + TypeScript projects.
editLink: true
skillParent: dcc-coding
skillName: nuxt
skillDescription: "Nuxt.js + Vue + TypeScript coding conventions: Composition API with <script setup>, file naming (kebab-case pages/PascalCase components/camelCase utils), composables, Nuxt import aliases, Tailwind + Lucide, Biome linting, and Bun dependency management. Use when creating or reviewing .vue/.ts files or Nuxt frontend code."
---
# Nuxt.js + TypeScript Coding Standards

These coding standards define how we write, organize, and maintain our **Nuxt.js + TypeScript** projects.  
By following them, we ensure our codebase remains **consistent, predictable, and easy to evolve**.

## Philosophy

Our primary goals are:

- **Consistency:** Every file should look and behave predictably across the project.
- **Clarity:** Code should express its intent clearly, without unnecessary complexity.
- **Type Safety:** Strong typing prevents subtle bugs and simplifies refactoring.
- **Maintainability:** Future developers should understand the system without relying on tribal knowledge.
- **AI-Friendly:** Clear code standards help Generative AI tools better understand and generate code that aligns with our project conventions.

All contributors must follow these standards unless explicitly justified with a clear reason.

## General Principles

- **Do:** Write all code in **TypeScript** with full type coverage.
- **Do:** Follow the [**Composition API**](https://vuejs.org/guide/introduction.html#composition-api) when writing Vue components.
- **Do:** Use [**Biome**](https://biomejs.dev/) to lint and format your code before committing.
- **Do:** Use the **new `app/` directory** for Nuxt applications.
- **Do:** Use [**Tailwind CSS**](https://tailwindcss.com/) for styling and [**Lucide icons**](https://lucide.dev/) for icons.
- **Do:** Organize and name files consistently to make navigation intuitive.

## Naming Conventions

### Pages: kebab-case

**Do:** Write all page file names using lowercase letters separated by dashes.

| Type     | Example                                          |
| -------- | ------------------------------------------------ |
| ✅ Right | `pages/user-profile.vue`                         |
| ❌ Wrong | `pages/UserProfile.vue`, `pages/userProfile.vue` |

**Why:** Kebab-case improves readability in URLs and aligns with Nuxt’s default routing system.

### Components: PascalCase

**Do:** Name Vue components in **PascalCase** — each word starts with an uppercase letter.

| Type     | Example                                                              |
| -------- | -------------------------------------------------------------------- |
| ✅ Right | `components/UserProfileCard.vue`                                     |
| ❌ Wrong | `components/userProfileCard.vue`, `components/user-profile-card.vue` |

**Why:** Vue automatically registers components in PascalCase, which aligns with Vue’s recommended naming conventions for ease of import and recognition.

### Other TypeScript Files: camelCase

**Do:** Name internal logic or utility files in **camelCase**.

| Type     | Example                                       |
| -------- | --------------------------------------------- |
| ✅ Right | `utils/formatDate.ts`                         |
| ❌ Wrong | `utils/format-date.ts`, `utils/FormatDate.ts` |

**Why:** camelCase is standard for variables and functions in JavaScript and helps visually differentiate them from Vue components or pages.

### Server API Files: kebab-case

**Do:** Write all server API file names using lowercase letters separated by dashes.

| Type     | Example                                       |
| -------- | --------------------------------------------- |
| ✅ Right | `server/api/user-profile.ts`                  |
| ❌ Wrong | `server/api/userProfile.ts`, `server/api/UserProfile.ts` |

**Why:** Kebab-case improves readability in API URLs and maintains consistency with page routing conventions.

## Import Aliases

**Do:** Use Nuxt's built-in aliases for imports to maintain consistent paths across the project.

| Alias | Points To | Example |
|-------|-----------|---------|
| `~/` | `/app` directory | `import { useUser } from '~/composables/useUser'` |
| `~~/` | Root directory | `import config from '~~/nuxt.config'` |
| `~~/server` | Server directory | `import { validateUser } from '~~/server/utils/validation'` |
| `#shared` | Shared code (client & server) | `import { UserSchema } from '#shared/types/user'` |

```typescript
// ✅ Right
import { useCounter } from '~/composables/useCounter'
import { formatDate } from '~/utils/formatDate'
import { UserService } from '~~/server/services/userService'
import { ApiResponse } from '#shared/types/api'

// ❌ Wrong
import { useCounter } from '../../../composables/useCounter'
import { formatDate } from '../../utils/formatDate'
```

**Why:** Aliases eliminate brittle relative paths, make imports more readable, and prevent path errors when moving files. They also help Generative AI understand the project structure more clearly.

**Reference:** [Nuxt Aliases Documentation](https://nuxt.com/docs/4.x/api/nuxt-config#alias)

## Typing Rules

- **Do:** Enforce full TypeScript typing — no implicit `any`.
- **Do:** Use `never` for unreachable code paths.
- **Do:** Use `unknown` when the type is genuinely uncertain, but always validate before use.
- **Do not:** Use `unknown` and then cast it without validation.
- **Do:** Prefer precise, narrow types.
- **Do:** Define reusable interfaces and types in a `/types` folder.

```ts
// ✅ Right
try {
  // ... some code
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

**Why:** Explicit typing prevents runtime bugs, improves IDE autocomplete, and ensures safety in refactors.

## Composition vs Options API

- **Do:** Use the **Composition API** exclusively.
- **Do not:** Use the Options API (`data`, `methods`, `computed`, etc.).

```vue
<!-- ✅ Right -->
<script setup lang="ts">
const count = ref(0);
function increment() {
  count.value++;
}
</script>

<!-- ❌ Wrong -->
<script lang="ts">
export default {
  data() {
    return { count: 0 };
  },
  methods: {
    increment() {
      this.count++;
    },
  },
};
</script>
```

**Why:** The Composition API provides better type inference, reusability, and scalability for complex logic.

## Function Style

- **Do:** Use standard function declarations (`function foo() {}`).
- **Try not to:** Use arrow functions for top-level definitions unless necessary.

```ts
// ✅ Right
function formatName(name: string): string {
  return name.trim();
}

// ❌ Wrong
const formatName = (name: string): string => name.trim();
```

**Why:** Named function declarations improve stack traces, readability, and hoisting behavior.

## Composables

- **Do:** Name composables starting with `use`.
- **Do:** Each composable should expose a main `use*` function that handles logic.
- **Do:** Place composables that depend on Vue reactivity or lifecycle in `/composables`.
- **Try not to:** Create a composable for logic that’s independent of Vue; put those in `/utils` or `/services` instead.

```ts
// ✅ Right (in composables/useCounter.ts)
export function useCounter() {
  const count = ref(0);
  function increment() {
    count.value++;
  }
  return { count, increment };
}

// ❌ Wrong
export const counter = {
  count: ref(0),
};
```

**Why:** The “use” convention makes composables easily discoverable and standardizes how reactive state and lifecycle logic are structured.

## Utilities and Services

- **Do:** Keep framework-agnostic functions in `/utils`.
- **Try:** Use `/services` for code that’s auto-import–independent or relates to APIs and business logic.

```ts
// ✅ utils/formatDate.ts
export function formatDate(date: Date) {
  return date.toISOString().split("T");
}

// ✅ services/userServices.ts
export async function fetchUser(id: string) {
  return await $fetch(`/api/user/${id}`);
}
```

**Why:** Separating concerns by folder clarifies function intent, improves reusability, and prevents tight coupling with Nuxt runtime context.

## Styling

- **Do:** Use Tailwind CSS for all styling.
- **Do:** Use Lucide icons from [lucide.dev](https://lucide.dev/).

```vue
<template>
    <div class="flex items-center gap-2 px-4 py-2">
        <UButton icon="i-lucide-plus">
            Add Item
        </UButton>
    </div>
</template>
```

**Why:** Tailwind ensures consistent, responsive UI styling without writing custom CSS. Lucide provides lightweight, modern SVG icons with a unified design language.

## Using Biome

- **Do:** Always run `biome check` before pushing code.
- **Do:** Fix all lint and format issues before committing.

```bash
# ✅ Right
bun run check
```

**Why:** Biome ensures consistent formatting and code quality across the entire project.

## Dependency Management

We use **[Bun](https://bun.sh/)** for package management and as our JavaScript runtime.

### Dependency Cooldowns

To prevent instability, catch potential regressions, and **mitigate supply chain attacks**, we use **dependency cooldowns**. This ensures that we only update to new package versions after they have been available for at least 7 days, allowing time for malicious or buggy releases to be identified and retracted by the community.

We configure this using `bunfig.toml` (see [Bun documentation](https://bun.com/docs/runtime/bunfig#install-minimumreleaseage)):

```toml
[install]
# Global cooldown: ignore releases newer than 7 days (in seconds)
minimumReleaseAge = 604800

# These packages bypass the 7-day minimum age requirement (e.g., internal packages)
minimumReleaseAgeExcludes = [
  "@types/bun",
  "@dcc-bs/audio-recorder.bs.js",
  "@dcc-bs/common-ui.bs.js",
  "@dcc-bs/communication.bs.js",
  "@dcc-bs/event-system.bs.js",
  "@dcc-bs/dependency-injection.bs.js"
]
```

## Folder Structure Example

```
app/
 ├─ components/
 │   └─ UserCard.vue
 ├─ composables/
 │   └─ useUser.ts
 ├─ pages/
 │   └─ user-profile.vue
 ├─ utils/
 │   └─ formatDate.ts
 ├─ services/
 │   └─ userService.ts
 └─ types/
     └─ user.ts
server/
  ├─ api/
  │   └─ user-account.get.ts
  ├─ plugins/
  │   └─ startupPlugin.ts
  └─ middleware
    └─ redirectMiddleware.ts
shared/
  └─ types/
    └─ userTypes.ts
```

**Why:** A consistent structure makes the codebase predictable and easy to navigate for all team members.
