---
outline: deep
skillParent: dcc-ui
skillName: changelogs
skillDescription: "Propless Changelogs component that fetches changelog entries from the /changelogs endpoint, renders Markdown, and shows a modal of unread versions tracked via the changelogs-last-read localStorage key. Use when surfacing release notes or what's new to users on app load."
---
# Changelogs

The `Changelogs` component displays a modal with application changelog information. It automatically fetches changelog data from the server and shows unread entries to users. The component tracks the last read version in localStorage and only shows new changelogs.

## Features

- **Automatic Fetching**: Retrieves changelog data from `/changelogs` endpoint
- **Version Tracking**: Shows only unread changelogs based on stored version
- **Markdown Support**: Renders changelog content with Markdown formatting
- **Responsive Design**: Modal with fullscreen option for better readability
- **Smart Updates**: Only displays when new versions are available
- **localStorage Integration**: Automatically tracks the last read changelog version

## Props

This component has no props - it works automatically!

## Server Setup

Changelog files should be stored in your `server/assets/changelogs` directory as Markdown files.

### Changelog File Format

Each changelog file should follow this frontmatter format:

```markdown
---
title: "Version 1.1.0"
version: "1.1.0"
published_at: "2024-01-15T10:00:00Z"
---

## New Features

- Added new changelog component
- Improved performance
- Enhanced user experience

## Bug Fixes

- Fixed memory leak issue
- Resolved navigation bug

## Breaking Changes

- Updated API endpoint structure
```

### File Naming Convention

Name your changelog files consistently, for example:
- `changelog-1.0.0.md`
- `changelog-1.1.0.md`
- `changelog-2.0.0.md`

## Usage

### Basic Implementation

Simply add the component to your layout or page:

```vue-vue
<template>
  <div>
    <Changelogs />
    <!-- Your app content -->
  </div>
</template>
```

### In a Layout

Perfect for displaying in your default layout:

```vue-vue
<template>
  <div>
    <NavigationBar />
    <main>
      <slot />
    </main>
    <Changelogs />
  </div>
</template>
```

### Testing & Development

For development and testing purposes, you can clear the changelog cache:

```vue-vue
<script setup>
function clearChangelogCache() {
  localStorage.removeItem("changelogs-last-read");
  location.reload();
}
</script>

<template>
  <div>
    <button @click="clearChangelogCache">
      Clear Changelog Cache
    </button>
    <Changelogs />
  </div>
</template>
```

## How It Works

1. **First Visit**: When a user visits your application for the first time, the component checks for available changelogs
2. **Version Comparison**: It compares the stored version (from localStorage) with available changelog versions
3. **Modal Display**: If new versions are found, a modal appears showing all unread changelogs
4. **Version Update**: Once the user closes the modal, the latest version is stored in localStorage
5. **Subsequent Visits**: On future visits, only changelogs newer than the stored version will be shown

## API Endpoint

The component expects a GET endpoint at `/changelogs` that returns an array of changelog objects:

```typescript
interface Changelog {
  title: string;
  version: string;
  published_at: string;
  content: string; // Markdown content
}
```

Example server response:

```json
[
  {
    "title": "Version 1.1.0",
    "version": "1.1.0",
    "published_at": "2024-01-15T10:00:00Z",
    "content": "## New Features\n- Feature 1\n- Feature 2"
  },
  {
    "title": "Version 1.0.0",
    "version": "1.0.0",
    "published_at": "2024-01-01T10:00:00Z",
    "content": "## Initial Release\n- First version"
  }
]
```

## Version Sorting

Changelogs are automatically sorted by version number (newest first) using semantic versioning comparison. The component intelligently handles version formats like:
- `1.0.0`
- `1.2.3`
- `2.0.0-beta.1`

## localStorage Key

The component uses the localStorage key `changelogs-last-read` to track the last viewed changelog version.

## Best Practices

1. **Keep It Concise**: Write clear, concise changelog entries
2. **Categorize Changes**: Use sections like "New Features", "Bug Fixes", "Breaking Changes"
3. **Semantic Versioning**: Follow semantic versioning (MAJOR.MINOR.PATCH)
4. **Regular Updates**: Update changelogs with each significant release
5. **User-Friendly Language**: Write for your users, not just developers
