/**
 * Reads a JSON Lines stream record by record. A single read() can hold
 * several records or only part of one, so only complete lines are parsed and
 * a trailing partial line waits for the next read.
 *
 * @param stream - The response body to read.
 * @returns The parsed records, in stream order.
 */
export async function* readJsonLines(
    stream: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown, void, void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    try {
        while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split("\n");
            buffer = done ? "" : (lines.pop() ?? "");
            for (const line of lines) {
                if (line.trim() !== "") {
                    yield JSON.parse(line);
                }
            }
            if (done) {
                finished = true;
                return;
            }
        }
    } finally {
        // Releasing the lock alone leaves the response running when the
        // consumer stops early or a line fails to parse.
        if (!finished) {
            await reader.cancel().catch(() => undefined);
        }
        reader.releaseLock();
    }
}
