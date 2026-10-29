import { describe, expect, it } from "vitest";
import { readJsonLines } from "../../../app/utils/jsonLines";

/**
 * A stream that delivers the given chunks as separate reads.
 */
function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
}

async function collect(stream: ReadableStream<Uint8Array>) {
    const records: unknown[] = [];
    for await (const record of readJsonLines(stream)) {
        records.push(record);
    }
    return records;
}

describe("readJsonLines", () => {
    it("parses several records delivered in one read", async () => {
        expect(await collect(streamOf('{"a":1}\n{"a":2}\n'))).toEqual([
            { a: 1 },
            { a: 2 },
        ]);
    });

    it("joins a record split across reads", async () => {
        expect(
            await collect(streamOf('{"text":"Mün', 'ster"}\n{"a":', "2}\n")),
        ).toEqual([{ text: "Münster" }, { a: 2 }]);
    });

    it("parses a last record without trailing newline and skips blank lines", async () => {
        expect(await collect(streamOf('\n{"a":1}\n\n{"a":2}'))).toEqual([
            { a: 1 },
            { a: 2 },
        ]);
    });

    it("joins a multi-byte character split across reads", async () => {
        const bytes = new TextEncoder().encode('{"text":"ü"}\n');
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                // "ü" is two bytes in UTF-8; split between them.
                controller.enqueue(bytes.slice(0, 10));
                controller.enqueue(bytes.slice(10));
                controller.close();
            },
        });
        expect(await collect(stream)).toEqual([{ text: "ü" }]);
    });
});
