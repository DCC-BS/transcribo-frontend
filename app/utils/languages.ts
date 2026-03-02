/**
 * Language interface defining the structure for language objects
 */
export interface Language {
    code: string;
    icon: string;
}

/**
 * Array of supported languages with their language codes and flag icons
 * Icons are sourced from https://icones.js.org/collection/flag
 *
 * Priority languages (de, en, fr, it) are at the top, followed by others alphabetically
 */
export const languages: Language[] = [
    // Priority languages at the top
    { code: "de", icon: "flag:de-4x3" }, // German - Germany
    { code: "en-us", icon: "flag:us-4x3" }, // English - United States
    { code: "en-gb", icon: "flag:gb-4x3" }, // English - United Kingdom
    { code: "fr", icon: "flag:fr-4x3" }, // French - France
    { code: "it", icon: "flag:it-4x3" }, // Italian - Italy
    // Other languages alphabetically
    { code: "af", icon: "flag:za-4x3" }, // Afrikaans - South Africa
    { code: "ar", icon: "flag:sa-4x3" }, // Arabic - Saudi Arabia
    { code: "bg", icon: "flag:bg-4x3" }, // Bulgarian - Bulgaria
    { code: "bn", icon: "flag:bd-4x3" }, // Bengali - Bangladesh
    { code: "ca", icon: "flag:es-ct-4x3" }, // Catalan - Catalonia
    { code: "cs", icon: "flag:cz-4x3" }, // Czech - Czech Republic
    { code: "cy", icon: "flag:gb-wls-4x3" }, // Welsh - Wales
    { code: "da", icon: "flag:dk-4x3" }, // Danish - Denmark
    { code: "el", icon: "flag:gr-4x3" }, // Greek - Greece
    { code: "es", icon: "flag:es-4x3" }, // Spanish - Spain
    { code: "et", icon: "flag:ee-4x3" }, // Estonian - Estonia
    { code: "fa", icon: "flag:ir-4x3" }, // Persian - Iran
    { code: "fi", icon: "flag:fi-4x3" }, // Finnish - Finland
    { code: "gu", icon: "flag:in-4x3" }, // Gujarati - India
    { code: "he", icon: "flag:il-4x3" }, // Hebrew - Israel
    { code: "hi", icon: "flag:in-4x3" }, // Hindi - India
    { code: "hr", icon: "flag:hr-4x3" }, // Croatian - Croatia
    { code: "hu", icon: "flag:hu-4x3" }, // Hungarian - Hungary
    { code: "id", icon: "flag:id-4x3" }, // Indonesian - Indonesia
    { code: "ja", icon: "flag:jp-4x3" }, // Japanese - Japan
    { code: "kn", icon: "flag:in-4x3" }, // Kannada - India
    { code: "ko", icon: "flag:kr-4x3" }, // Korean - South Korea
    { code: "lt", icon: "flag:lt-4x3" }, // Lithuanian - Lithuania
    { code: "lv", icon: "flag:lv-4x3" }, // Latvian - Latvia
    { code: "mk", icon: "flag:mk-4x3" }, // Macedonian - North Macedonia
    { code: "ml", icon: "flag:in-4x3" }, // Malayalam - India
    { code: "mr", icon: "flag:in-4x3" }, // Marathi - India
    { code: "ne", icon: "flag:np-4x3" }, // Nepali - Nepal
    { code: "nl", icon: "flag:nl-4x3" }, // Dutch - Netherlands
    { code: "no", icon: "flag:no-4x3" }, // Norwegian - Norway
    { code: "pa", icon: "flag:in-4x3" }, // Punjabi - India
    { code: "pl", icon: "flag:pl-4x3" }, // Polish - Poland
    { code: "pt", icon: "flag:pt-4x3" }, // Portuguese - Portugal
    { code: "ro", icon: "flag:ro-4x3" }, // Romanian - Romania
    { code: "ru", icon: "flag:ru-4x3" }, // Russian - Russia
    { code: "sk", icon: "flag:sk-4x3" }, // Slovak - Slovakia
    { code: "sl", icon: "flag:si-4x3" }, // Slovenian - Slovenia
    { code: "so", icon: "flag:so-4x3" }, // Somali - Somalia
    { code: "sq", icon: "flag:al-4x3" }, // Albanian - Albania
    { code: "sv", icon: "flag:se-4x3" }, // Swedish - Sweden
    { code: "sw", icon: "flag:tz-4x3" }, // Swahili - Tanzania
    { code: "ta", icon: "flag:in-4x3" }, // Tamil - India
    { code: "te", icon: "flag:in-4x3" }, // Telugu - India
    { code: "th", icon: "flag:th-4x3" }, // Thai - Thailand
    { code: "tl", icon: "flag:ph-4x3" }, // Filipino - Philippines
    { code: "tr", icon: "flag:tr-4x3" }, // Turkish - Turkey
    { code: "uk", icon: "flag:ua-4x3" }, // Ukrainian - Ukraine
    { code: "ur", icon: "flag:pk-4x3" }, // Urdu - Pakistan
    { code: "vi", icon: "flag:vn-4x3" }, // Vietnamese - Vietnam
    { code: "zh-cn", icon: "flag:cn-4x3" }, // Chinese (Simplified) - China
    { code: "zh-tw", icon: "flag:tw-4x3" }, // Chinese (Traditional) - Taiwan
];

export type LanguageCode = Language["code"];
