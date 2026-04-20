import type { SelectMenuItem } from "@nuxt/ui";

export function useLanguageOptions() {
    const { t } = useI18n();

    return computed<SelectMenuItem[]>(() => [
        { label: t("languages.autoDetect"), value: "auto", icon: "i-lucide-languages" },
        ...languages.map((lang) => ({
            label: t(`languages.${lang.code}`),
            value: lang.code,
            icon: lang.icon,
        })),
    ]);
}
