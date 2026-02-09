<script lang="ts" setup>
import type { SelectMenuItem } from '@nuxt/ui';
import type { MediaSelectionData } from '~/types/mediaStepInOut';


interface InputProps {
    data: MediaSelectionData
};

const props = defineProps<InputProps>();

const { t } = useI18n();

// Speaker options for the select input
const speakerOptions = [
    { label: t("upload.autoDetection"), value: "auto" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
];
const audioLanguageOptions = ref<SelectMenuItem[]>([
    { label: t("upload.autoDetection"), value: "auto" },
    { label: t("languages.de"), value: "de" },
    { label: t("languages.fr"), value: "fr" },
    { label: t("languages.it"), value: "it" },
    { label: t("languages.en"), value: "en" },
    { label: t("languages.es"), value: "es" },
    { label: t("languages.pt"), value: "pt" },
    { label: t("languages.ru"), value: "ru" },
    { label: t("languages.zh"), value: "zh" },
    { label: t("languages.ko"), value: "ko" },
    { label: t("languages.ja"), value: "ja" },
    { label: t("languages.tr"), value: "tr" },
    { label: t("languages.pl"), value: "pl" },
    { label: t("languages.ca"), value: "ca" },
    { label: t("languages.nl"), value: "nl" },
    { label: t("languages.ar"), value: "ar" },
    { label: t("languages.sv"), value: "sv" },
    { label: t("languages.id"), value: "id" },
    { label: t("languages.hi"), value: "hi" },
    { label: t("languages.fi"), value: "fi" },
    { label: t("languages.vi"), value: "vi" },
    { label: t("languages.he"), value: "he" },
    { label: t("languages.uk"), value: "uk" },
    { label: t("languages.el"), value: "el" },
    { label: t("languages.ms"), value: "ms" },
    { label: t("languages.cs"), value: "cs" },
    { label: t("languages.ro"), value: "ro" },
    { label: t("languages.da"), value: "da" },
    { label: t("languages.hu"), value: "hu" },
    { label: t("languages.ta"), value: "ta" },
    { label: t("languages.no"), value: "no" },
    { label: t("languages.th"), value: "th" },
    { label: t("languages.ur"), value: "ur" },
    { label: t("languages.hr"), value: "hr" },
    { label: t("languages.bg"), value: "bg" },
    { label: t("languages.lt"), value: "lt" },
    { label: t("languages.la"), value: "la" },
    { label: t("languages.mi"), value: "mi" },
    { label: t("languages.ml"), value: "ml" },
    { label: t("languages.cy"), value: "cy" },
    { label: t("languages.sk"), value: "sk" },
    { label: t("languages.te"), value: "te" },
    { label: t("languages.fa"), value: "fa" },
    { label: t("languages.lv"), value: "lv" },
    { label: t("languages.bn"), value: "bn" },
    { label: t("languages.sr"), value: "sr" },
    { label: t("languages.az"), value: "az" },
    { label: t("languages.sl"), value: "sl" },
    { label: t("languages.kn"), value: "kn" },
    { label: t("languages.et"), value: "et" },
    { label: t("languages.mk"), value: "mk" },
    { label: t("languages.br"), value: "br" },
    { label: t("languages.eu"), value: "eu" },
    { label: t("languages.is"), value: "is" },
    { label: t("languages.hy"), value: "hy" },
    { label: t("languages.ne"), value: "ne" },
    { label: t("languages.mn"), value: "mn" },
    { label: t("languages.bs"), value: "bs" },
    { label: t("languages.kk"), value: "kk" },
    { label: t("languages.sq"), value: "sq" },
    { label: t("languages.sw"), value: "sw" },
    { label: t("languages.gl"), value: "gl" },
    { label: t("languages.mr"), value: "mr" },
    { label: t("languages.pa"), value: "pa" },
    { label: t("languages.si"), value: "si" },
    { label: t("languages.km"), value: "km" },
    { label: t("languages.sn"), value: "sn" },
    { label: t("languages.yo"), value: "yo" },
    { label: t("languages.so"), value: "so" },
    { label: t("languages.af"), value: "af" },
    { label: t("languages.oc"), value: "oc" },
    { label: t("languages.ka"), value: "ka" },
    { label: t("languages.be"), value: "be" },
    { label: t("languages.tg"), value: "tg" },
    { label: t("languages.sd"), value: "sd" },
    { label: t("languages.gu"), value: "gu" },
    { label: t("languages.am"), value: "am" },
    { label: t("languages.yi"), value: "yi" },
    { label: t("languages.lo"), value: "lo" },
    { label: t("languages.uz"), value: "uz" },
    { label: t("languages.fo"), value: "fo" },
    { label: t("languages.ht"), value: "ht" },
    { label: t("languages.ps"), value: "ps" },
    { label: t("languages.tk"), value: "tk" },
    { label: t("languages.nn"), value: "nn" },
    { label: t("languages.mt"), value: "mt" },
    { label: t("languages.sa"), value: "sa" },
    { label: t("languages.lb"), value: "lb" },
    { label: t("languages.my"), value: "my" },
    { label: t("languages.bo"), value: "bo" },
    { label: t("languages.tl"), value: "tl" },
    { label: t("languages.mg"), value: "mg" },
    { label: t("languages.as"), value: "as" },
    { label: t("languages.tt"), value: "tt" },
    { label: t("languages.haw"), value: "haw" },
    { label: t("languages.ln"), value: "ln" },
    { label: t("languages.ha"), value: "ha" },
    { label: t("languages.ba"), value: "ba" },
    { label: t("languages.jw"), value: "jw" },
    { label: t("languages.su"), value: "su" },
    { label: t("languages.yue"), value: "yue" }
]);


const isVideo = computed(() => isVideoFile(props.data.media));
const mediaSource = computed(() => URL.createObjectURL(props.data.media));

const numSpeakers = ref<string>("auto");
const audioLanguage = ref<string>("de");

function isVideoFile(file: File): boolean {
    return file.type.startsWith("video/");
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
</script>

<template>
    <div class="flex flex-col md:flex-row gap-2 justify-center">
        <div v-if="isVideo">
            <video controls>
                <source :src="mediaSource" :type="props.data.media.type" />
            </video>
        </div>
        <div v-else>
            <div class="flex">
                <UIcon name="i-lucide-audio-lines" class="min-h-[50px]" />
                <div>{{ props.data.media.name }}</div>
                <div>{{ formatFileSize(props.data.media.size)}} </div>
            </div>
            <audio controls class="flex-1 w-full">
                <source :src="mediaSource" :type="props.data.media.type" />
            </audio>
        </div>

        <div class="space-y-4 mt-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t("upload.numSpeakers") }}
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {{ t("upload.numSpeakersHelp") }}
                </p>
                <USelect v-model="numSpeakers" :items="speakerOptions"
                    :ui="{ base: 'w-[250px]' }" placeholder="Select number of speakers" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ t("upload.audioLanguage") }}
                </label>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {{ t("upload.audioLanguageHelp") }}
                </p>
                <USelectMenu v-model="audioLanguage" value-key="value" :ui="{ base: 'w-[250px]' }"
                    :items="audioLanguageOptions" />
            </div>
        </div>
    </div>
</template>
