# Transcribo Frontend - Agent Coding Guidelines

## Build & Development Commands

```bash
# Install dependencies (Bun required, not npm)
bun install

# Development server
bun run dev

# Build for production
bun run build

# Linting & Formatting
bun run lint      # Biome format
bun run check      # Biome check & fix

# Testing (Vitest)
bun test          # Run tests
bun test:watch    # Watch mode
bun test:coverage # Coverage report
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
#shared   // shared client/server code
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
  composables/   # use* functions (camelCase)
  pages/         # Routes (kebab-case)
  utils/         # Framework-agnostic utilities
  services/      # API/business logic
  types/         # TypeScript definitions
server/
  api/           # API endpoints (kebab-case)
  plugins/       # Nitro plugins
shared/
  types/         # Shared client/server types
```

## Nuxt Features
- Auto-imports enabled for composables, utils, components
- TypeScript strict mode enabled
- Pinia for state management
- Nuxt UI for components
- i18n for internationalization (en, de)

## Testing
- Vitest is the test runner
- Run tests before committing
- Tests are currently minimal - expand coverage when adding features

## Before Committing
1. Run `bun run check` - fix all linting issues
2. Run `bun test` - ensure tests pass
3. Run `bun run build` - ensure production build works
