<script lang="ts" setup>

/**
 * Access i18n functionality
 */
const { t, locale } = useI18n();

/**
 * Gets the appropriate key name based on the current locale
 */
function getKeyName(key: string): string {
    const keyMappings: Record<string, Record<string, string>> = {
        'en': {
            'Space': 'Space',
            'Shift': 'Shift',
            'Ctrl': 'Ctrl',
            'Alt': 'Alt',
            'Z': 'Z',
            'Y': 'Y',
        },
        'de': {
            'Space': 'Leertaste',
            'Shift': 'Umschalt',
            'Ctrl': 'Strg',
            'Alt': 'Alt',
            'Z': 'Z',
            'Y': 'Y',
        }
    };

    const currentLocale = locale.value as string;
    return keyMappings[currentLocale]?.[key] || key;
}
</script>

<template>
    <div class="help-view">
        <div class="help-content">
            <h1>{{ t('help.title') }}</h1>

            <section>
                <h2>{{ t('help.mediaControls.title') }}</h2>
                <ul>
                    <li>
                        {{ t('help.mediaControls.spacebar', { key: '' }) }}
                        <UKbd :value="getKeyName('Space')" />
                    </li>
                    <li>{{ t('help.mediaControls.spectrogramClick') }}</li>
                    <li>
                        {{ t('help.mediaControls.arrowKeys', { leftKey: '', rightKey: '' }) }}
                        <UKbd value="←" /> {{ t('or') }}
                        <UKbd value="→" />
                    </li>
                    <li>
                        {{ t('help.mediaControls.shiftArrows', { shiftKey: '', leftKey: '', rightKey: '' }) }}
                        <UKbd :value="getKeyName('Shift')" /> +
                        <UKbd value="←" />/
                        <UKbd value="→" />
                    </li>
                    <li>
                        {{ t('help.mediaControls.ctrlArrows', { ctrlKey: '', leftKey: '', rightKey: '' }) }}
                        <UKbd :value="getKeyName('Ctrl')" /> +
                        <UKbd value="←" />/
                        <UKbd value="→" />
                    </li>
                    <li>{{ t('help.mediaControls.mouseWheel') }}</li>
                    <li>
                        {{ t('help.mediaControls.ctrlClick', { ctrlKey: '' }) }}
                        <UKbd :value="getKeyName('Ctrl')" />
                    </li>
                </ul>
                <img src="../assets/img/mediaControls.png"
                    :alt="locale === 'en' ? 'Media controls illustration' : 'Illustration der Mediensteuerung'" />
            </section>

            <section>
                <h2>{{ t('help.segments.title') }}</h2>
                <p>{{ t('help.segments.intro') }}</p>
                <ul>
                    <li>{{ t('help.segments.speaker') }}</li>
                    <li>{{ t('help.segments.timeChange') }}</li>
                    <li>{{ t('help.segments.seekTime') }}</li>
                    <li>{{ t('help.segments.insertBefore') }}</li>
                    <li>{{ t('help.segments.insertAfter') }}</li>
                    <li>{{ t('help.segments.deleteSegment') }}</li>
                </ul>
                <img src="../assets/img/segmentEditing.png"
                    :alt="locale === 'en' ? 'Segment editing illustration' : 'Illustration der Segmentbearbeitung'" />
            </section>

            <section>
                <h2>{{ t('help.timeline.title') }}</h2>
                <ul>
                    <li>{{ t('help.timeline.hoverText') }}</li>
                    <li>{{ t('help.timeline.clickSelect') }}</li>
                    <li>{{ t('help.timeline.moveWithKeys') }}</li>
                    <li>{{ t('help.timeline.dragMove') }}</li>
                    <li>{{ t('help.timeline.resizeHandles') }}</li>
                    <li>
                        {{ t('help.timeline.altSnap', { altKey: '' }) }}
                        <UKbd :value="getKeyName('Alt')" />
                    </li>
                </ul>
                <img src="../assets/img/timelineSegments.png"
                    :alt="locale === 'en' ? 'Timeline segments illustration' : 'Illustration der Zeitleistensegmente'" />
            </section>

            <section>
                <h2>{{ t('help.editing.title') }}</h2>
                <ul>
                    <li>
                        {{ t('help.editing.undo', { ctrlKey: '', zKey: '' }) }}
                        <UKbd :value="getKeyName('Ctrl') " /> +
                        <UKbd :value="getKeyName('Z')" />
                    </li>
                    <li>
                        {{ t('help.editing.redo', { ctrlKey: '', yKey: '' }) }}
                        <UKbd :value="getKeyName('Ctrl') " /> +
                        <UKbd :value="getKeyName('Y')" />
                    </li>
                    <li>{{ t('help.editing.buttons') }}</li>
                </ul>
            </section>
        </div>
    </div>
</template>

<style scoped>
.help-view {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.language-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.language-selector button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    cursor: pointer;
    border-radius: 4px;
}

.language-selector button.active {
    background: #007bff;
    color: white;
    border-color: #0056b3;
}

.help-content {
    background-color: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
    color: #333;
}

h2 {
    font-size: 1.8rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #444;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.5rem;
}

section {
    margin-bottom: 2rem;
}

ul {
    padding-left: 20px;
    margin-bottom: 1.5rem;
}

li {
    margin-bottom: 0.75rem;
    line-height: 1.6;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
}

img {
    max-width: 100%;
    height: auto;
    margin: 1rem 0;
    border-radius: 4px;
    border: 1px solid #eee;
}
</style>
