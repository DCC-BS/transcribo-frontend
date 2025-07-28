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
        en: {
            Space: "Space",
            Shift: "Shift",
            Ctrl: "Ctrl",
            Alt: "Alt",
            Z: "Z",
            Y: "Y",
        },
        de: {
            Space: "Leertaste",
            Shift: "Umschalt",
            Ctrl: "Strg",
            Alt: "Alt",
            Z: "Z",
            Y: "Y",
        },
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
                    <i18n-t keypath="help.mediaControls.spacebar" tag="li">
                        <template #space>
                            <UKbd :value="getKeyName('Space')" />
                        </template>
                    </i18n-t>
                    <i18n-t
                        keypath="help.mediaControls.spectrogramClick"
                        tag="li"
                    >
                        <template #spectrogram>
                            <span class="text-highlight highlight-orange">{{
                                t('help.mediaControls.spectrogram')
                            }}</span>
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.mediaControls.arrowKeys" tag="li">
                        <template #leftKey>
                            <UKbd value="←" />
                        </template>
                        <template #rightKey>
                            <UKbd value="→" />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.mediaControls.shiftArrows" tag="li">
                        <template #shiftKey>
                            <UKbd value="shift" />
                        </template>
                        <template #leftKey>
                            <UKbd value="←" />
                        </template>
                        <template #rightKey>
                            <UKbd value="→" />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.mediaControls.ctrlArrows" tag="li">
                        <template #ctrlKey>
                            <UKbd value="ctrl" />
                        </template>
                        <template #leftKey>
                            <UKbd value="←" />
                        </template>
                        <template #rightKey>
                            <UKbd value="→" />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.mediaControls.mouseWheel" tag="li">
                        <template #timeline>
                            <span class="text-highlight highlight-green">{{
                                t('help.mediaControls.timeline')
                            }}</span>
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.mediaControls.ctrlClick" tag="li">
                        <template #ctrlKey>
                            <UKbd value="ctrl" />
                        </template>
                        <template #timeline>
                            <span class="text-highlight highlight-green">{{
                                t('help.mediaControls.timeline')
                            }}</span>
                        </template>
                    </i18n-t>
                </ul>
                <img
                    src="../assets/img/mediaControls.png"
                    :alt="
                        locale === 'en'
                            ? 'Media controls illustration'
                            : 'Illustration der Mediensteuerung'
                    "
                >
            </section>

            <section>
                <h2>{{ t('help.segments.title') }}</h2>
                <i18n-t keypath="help.segments.intro" tag="p">
                    <template #transcriptionSegment>
                        <span class="text-highlight highlight-violet">{{
                            t('help.segments.transcriptionSegment')
                        }}</span>
                    </template>
                </i18n-t>
                <ul>
                    <i18n-t keypath="help.segments.speaker" tag="li">
                        <template #dropdown>
                            <span class="text-highlight highlight-teal">{{
                                t('help.segments.dropdown')
                            }}</span>
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.segments.timeChange" tag="li">
                        <template #timespanTextFields>
                            <span class="text-highlight highlight-mangenta">{{
                                t('help.segments.timespanTextFields')
                            }}</span>
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.segments.seekTime" tag="li" />
                    <i18n-t keypath="help.segments.insertBefore" tag="li">
                        <template #insertAbove>
                            <UButton
                                color="primary"
                                icon="i-heroicons-arrow-up-on-square-stack"
                            />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.segments.insertAfter" tag="li">
                        <template #insertBelow>
                            <UButton
                                color="primary"
                                icon="i-heroicons-arrow-down-on-square-stack"
                            />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.segments.deleteSegment" tag="li">
                        <template #delete>
                            <UButton color="error" icon="i-heroicons-trash" />
                        </template>
                    </i18n-t>
                </ul>
                <img
                    src="../assets/img/segmentEditing.png"
                    :alt="
                        locale === 'en'
                            ? 'Segment editing illustration'
                            : 'Illustration der Segmentbearbeitung'
                    "
                >
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
                <img
                    src="../assets/img/timelineSegments.png"
                    :alt="
                        locale === 'en'
                            ? 'Timeline segments illustration'
                            : 'Illustration der Zeitleistensegmente'
                    "
                >
            </section>

            <section>
                <h2>{{ t('help.editing.title') }}</h2>
                <ul>
                    <i18n-t keypath="help.editing.undo" tag="li">
                        <template #ctrlKey>
                            <UKbd value="ctrl" />
                        </template>
                        <template #zKey>
                            <UKbd value="z" />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.editing.redo" tag="li">
                        <template #ctrlKey>
                            <UKbd value="ctrl" />
                        </template>
                        <template #yKey>
                            <UKbd value="y" />
                        </template>
                    </i18n-t>
                    <i18n-t keypath="help.editing.buttons" tag="li" />
                </ul>
            </section>
        </div>
    </div>
</template>

<style scoped>
.text-highlight {
    @apply border-solid border-2;
    padding: 1px;
}

.highlight-orange {
    border-color: #ffaa00;
}

.highlight-green {
    border-color: #008055;
}

.highlight-violet {
    border-color: #600080;
}

.highlight-teal {
    border-color: #00aacc;
}

.highlight-mangenta {
    border-color: #b51c69;
}

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
    list-style-type: disc;
    line-height: 2rem;
}

img {
    max-width: 100%;
    height: auto;
    margin: 1rem 0;
    border-radius: 4px;
    border: 1px solid #eee;
}
</style>
