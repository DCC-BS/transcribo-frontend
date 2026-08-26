import { beforeEach, describe, expect, it } from "vitest";
import { useClientId } from "../../app/composables/useClientId";

describe("useClientId", () => {
    beforeEach(() => {
        localStorage.clear();
        useState<string | undefined>("transcribo_client_id").value = undefined;
    });

    it("generates a new client ID if none exists in localStorage", () => {
        const { getClientId } = useClientId();
        const id = getClientId();

        expect(id).toBeDefined();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
        expect(localStorage.getItem("transcribo_client_id")).toBe(id);
    });

    it("retrieves existing client ID from localStorage", () => {
        const existingId = "test-uuid-1234";
        localStorage.setItem("transcribo_client_id", existingId);

        const { getClientId } = useClientId();
        const id = getClientId();

        expect(id).toBe(existingId);
    });

    it("resets client ID with resetClientId", () => {
        const { getClientId, resetClientId } = useClientId();
        const initialId = getClientId();
        const newId = resetClientId();

        expect(newId).not.toBe(initialId);
        expect(localStorage.getItem("transcribo_client_id")).toBe(newId);
    });
});
