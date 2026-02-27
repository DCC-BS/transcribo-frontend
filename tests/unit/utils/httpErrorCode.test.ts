import { describe, expect, it } from "vitest";
import { isHttpStatusCode } from "../../../app/utils/httpErrorCode";

describe("isHttpStatusCode", () => {
    describe("statusCode property", () => {
        it("should return true when statusCode matches", () => {
            const error = { statusCode: 404 };
            expect(isHttpStatusCode(error, 404)).toBe(true);
        });

        it("should return false when statusCode does not match", () => {
            const error = { statusCode: 404 };
            expect(isHttpStatusCode(error, 500)).toBe(false);
        });

        it("should handle various status codes", () => {
            expect(isHttpStatusCode({ statusCode: 200 }, 200)).toBe(true);
            expect(isHttpStatusCode({ statusCode: 401 }, 401)).toBe(true);
            expect(isHttpStatusCode({ statusCode: 503 }, 503)).toBe(true);
        });
    });

    describe("response.status property", () => {
        it("should return true when response.status matches", () => {
            const error = { response: { status: 404 } };
            expect(isHttpStatusCode(error, 404)).toBe(true);
        });

        it("should return false when response.status does not match", () => {
            const error = { response: { status: 404 } };
            expect(isHttpStatusCode(error, 500)).toBe(false);
        });
    });

    describe("status property", () => {
        it("should return true when status matches", () => {
            const error = { status: 404 };
            expect(isHttpStatusCode(error, 404)).toBe(true);
        });

        it("should return false when status does not match", () => {
            const error = { status: 404 };
            expect(isHttpStatusCode(error, 500)).toBe(false);
        });
    });

    describe("invalid inputs", () => {
        it("should return false for null", () => {
            expect(isHttpStatusCode(null, 404)).toBe(false);
        });

        it("should return false for undefined", () => {
            expect(isHttpStatusCode(undefined, 404)).toBe(false);
        });

        it("should return false for string", () => {
            expect(isHttpStatusCode("error", 404)).toBe(false);
        });

        it("should return false for number", () => {
            expect(isHttpStatusCode(404, 404)).toBe(false);
        });

        it("should return false for empty object", () => {
            expect(isHttpStatusCode({}, 404)).toBe(false);
        });

        it("should return false when statusCode is not a number", () => {
            const error = { statusCode: "404" };
            expect(isHttpStatusCode(error, 404)).toBe(false);
        });

        it("should return false when status is not a number", () => {
            const error = { status: "404" };
            expect(isHttpStatusCode(error, 404)).toBe(false);
        });
    });

    describe("priority", () => {
        it("should check statusCode first", () => {
            const error = { statusCode: 404, status: 500, response: { status: 503 } };
            expect(isHttpStatusCode(error, 404)).toBe(true);
        });

        it("should check response.status if statusCode does not match", () => {
            const error = { statusCode: 404, status: 500, response: { status: 503 } };
            expect(isHttpStatusCode(error, 503)).toBe(true);
        });

        it("should check status if others do not match", () => {
            const error = { statusCode: 404, response: { status: 503 }, status: 500 };
            expect(isHttpStatusCode(error, 500)).toBe(true);
        });
    });
});
