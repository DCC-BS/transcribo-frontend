import { config } from "@vue/test-utils";
import { vi } from "vitest";

vi.stubGlobal("indexedDB", {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
});

const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

vi.stubGlobal("matchMedia", mockMatchMedia);

const mockResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

vi.stubGlobal("ResizeObserver", mockResizeObserver);

vi.stubGlobal("IntersectionObserver", vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})));

config.global.mocks = {
    $t: (key: string) => key,
    $i18n: {
        locale: "en",
    },
};
