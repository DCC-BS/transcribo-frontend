# Transcribo Frontend - Agent Coding Guidelines

## Build & Development Commands

```bash
# Install dependencies (Bun required, not npm)
bun install

# Development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Generate static site
bun run generate

# Linting & Formatting
bun run lint      # Biome format --write
bun run check     # Biome check --fix

# Docker
bun run docker:dev       # Start dev container
bun run docker:dev:down  # Stop dev container
bun run docker:prod      # Start production container
bun run docker:prod:down # Stop production container
```

## Package Manager
**Use `bun` for all package operations, NOT npm.**

## Code Style Guidelines

### TypeScript & Vue
- **Always use Composition API** (`<script setup lang="ts">`)
- **Never use `any` type** - use `unknown` with validation or specific types
- **Never use non-null assertion `!`** - structure code so TypeScript understands nullable values
- **Always use semicolons** - terminate all statements
- **Prefer undefined over null** - use `ref(undefined)` not `ref(null)`
- **Non-null refs** - initialize refs with values, not null
- **Explicit types** - function parameters and return types must be typed
- **Function declarations** - use `function foo()` not `const foo = () => {}`
- **Async/await** - prefer over promise chains

### Naming Conventions
- **Pages**: kebab-case (`user-profile.vue`)
- **Components**: PascalCase (`UserProfileCard.vue`)
- **Composables**: camelCase with `use` prefix (`useCounter.ts`)
- **Server API**: kebab-case (`user-account.get.ts`)
- **Utils/Services**: camelCase (`formatDate.ts`)

### Import Aliases
```typescript
~/        // app/ directory
~~/       // root directory
~~/server  // server directory
```

### UI & Styling
- **Use Nuxt UI components** instead of custom implementations
- **Use Tailwind CSS** for styling (native, no custom CSS when possible)
- **Use Lucide icons** (auto-imported via Nuxt UI)
- **Use motion** for animations (auto-imported via `motion-v`)

### Formatting (Biome)
- 4 space indentation
- Double quotes for strings
- Semicolons required
- `organizeImports` enabled

## Key Conventions from Cursor/Copilot Rules
- Use `===` and `!==` for equality
- No `console` in production code
- No `@ts-ignore` - always fix type errors
- No TypeScript enums
- No reassigning function parameters
- No unused imports/variables (ignored in .vue files)
- Use `for-of` instead of `forEach`
- Use `Array.isArray()` instead of `instanceof Array`
- Throw Error objects with messages
- Handle async errors properly with try/catch

## Project Structure
```
app/
  components/    # Vue components (PascalCase)
  composables/   # use* functions (camelCase) + other composables
  pages/         # Routes (kebab-case)
  utils/         # Framework-agnostic utilities
  services/      # API/business logic (e.g., indexDbService.ts)
  types/         # TypeScript definitions
  plugins/       # Nuxt plugins (e.g., api.ts, konvaPlugin.client.ts)
  layouts/       # Page layouts (default.vue, edit.vue)
  assets/        # Static assets (CSS, images, disclaimer.html)
server/
  api/           # API endpoints (kebab-case with HTTP method suffix)
  utils/         # Server utilities
  changelogs/    # Version changelog markdown files
  tsconfig.json  # Server-specific TypeScript config
public/
  ios/           # PWA icons for iOS
  icons.json     # PWA icon configuration
```

## Key Dependencies
- **Nuxt UI 4.x** - Component library
- **@ffmpeg/ffmpeg** - Audio/video processing in browser
- **dexie** - IndexedDB wrapper for local storage
- **konva / vue-konva** - Canvas rendering for timeline editor
- **ts-pattern** - Pattern matching
- **zod** - Runtime type validation
- **motion-v** - Vue animations

## Nuxt Features
- Auto-imports enabled for composables, utils, components
- TypeScript strict mode enabled
- Pinia for state management
- Nuxt UI for components
- i18n for internationalization (en, de)
- PWA support via @vite-pwa/nuxt
- Extends GitHub layers: backend_communication, health_check, feedback-control, logger

## Testing
- No test framework currently configured
- Tests should be added when implementing new features

## Before Committing
1. Run `bun run check` - fix all linting issues
2. Run `bun run build` - ensure production build works
