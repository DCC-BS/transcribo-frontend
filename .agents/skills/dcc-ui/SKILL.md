---
name: dcc-ui
description: "Nuxt module of the Kanton Basel-Stadt design system for DCC Basel-Stadt apps: NavigationBar, DataBsFooter, SplitContainer/SplitView, Disclaimer/DisclaimerButton/DisclaimerPage, Changelogs, OnlineStatus, UndoRedoButtons components, the useUserFeedback composable, and the BS color palette. Use when building a DCC/Basel-Stadt Vue/Nuxt frontend or wiring up the common-ui.bs.js module."
---

# dcc-ui

Nuxt module of the Kanton Basel-Stadt design system for DCC Basel-Stadt apps: NavigationBar, DataBsFooter, SplitContainer/SplitView, Disclaimer/DisclaimerButton/DisclaimerPage, Changelogs, OnlineStatus, UndoRedoButtons components, the useUserFeedback composable, and the BS color palette. Use when building a DCC/Basel-Stadt Vue/Nuxt frontend or wiring up the common-ui.bs.js module.

### Reference Sub-Guidelines
The following reference sub-guides are available in this skill directory. Read them using your file reading tools as needed:

- **[changelogs](references/changelogs.md)**: Propless Changelogs component that fetches changelog entries from the /changelogs endpoint, renders Markdown, and shows a modal of unread versions tracked via the changelogs-last-read localStorage key. Use when surfacing release notes or what's new to users on app load.
- **[databs-footer](references/databs-footer.md)**: DataBsFooter is a branded application footer with default DCC logo/branding and left, center, and right slots for custom links, version, or contact content. Use when adding a page footer.
- **[disclaimer](references/disclaimer.md)**: Modal Disclaimer Vue component that gatekeeps app access until the user accepts terms; tracks accepted version in localStorage with HTML content. Use when adding a one-time terms/usage-guidelines acceptance gate (not the re-open DisclaimerButton or full-page DisclaimerPage).
- **[disclaimer-button](references/disclaimer-button.md)**: DisclaimerButton is a button (variant outline or ghost) that re-opens the already-accepted disclaimer modal on demand. Use when users need to re-view terms after acceptance, e.g. in the NavigationBar. NOT the initial modal gate (disclaimer) or full page (disclaimer-page).
- **[disclaimer-page](references/disclaimer-page.md)**: DisclaimerPage is a full-page disclaimer view with contentHtml and postfixHtml props and an acceptance mechanism, shown before app access. Use for a dedicated standalone disclaimer/terms page. NOT the popup modal gate (disclaimer) or re-open button (disclaimer-button).
- **[navigation-bar](references/navigation-bar.md)**: NavigationBar is a responsive top nav bar with left/center/right slots plus rightPreItems/rightPostItems, including a built-in DisclaimerButton and LanguageSelect and i18n app-name branding. Use when building the app header/top navigation.
- **[online-status](references/online-status.md)**: OnlineStatus is a color-coded health indicator (green/red) with tooltip that polls a server health endpoint at a configurable pollInterval, with optional showText and custom isOnlineCheckFunction props. Use when showing live server connectivity status.
- **[split-container](references/split-container.md)**: SplitContainer is a propless card with header, left, and right slots showing two side-by-side panes (fixed border divider) that stack vertically on mobile. Use for static paired/comparison layouts. NOT user-resizable (use split-view for a draggable resizer).
- **[split-view](references/split-view.md)**: SplitView is a resizable two-pane layout with a draggable resizer, a/b slots, isHorizontal orientation toggle, and per-pane/resizer style props. Use when users need to drag-adjust pane proportions. NOT a fixed card (use split-container for a non-resizable header layout).
- **[undo-redo-buttons](references/undo-redo-buttons.md)**: UndoRedoButtons is a pair of tooltip buttons taking canUndo/canRedo props and emitting @undo/@redo events, auto-disabled when unavailable. Use when adding undo/redo controls to an editor or form.
- **[useUserFeedback](references/useUserFeedback.md)**: Vue/Nuxt composable returning showToast and showError to display Nuxt UI toast notifications (success/info/warning/error) and i18n-translated API error messages. Use when surfacing user feedback, toasts, or handling ApiError responses in a DCC frontend.

