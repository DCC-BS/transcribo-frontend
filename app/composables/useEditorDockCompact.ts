/*
    Collapsed state of the editor dock. Shared rather than local to the
    component so the onboarding can expand the lanes before pointing at
    them — they are not rendered at all while the dock is compact.
*/
export function useEditorDockCompact(): Ref<boolean> {
    return useState<boolean>("editor-dock-compact", () => false);
}
