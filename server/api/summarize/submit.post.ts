import { ApiError } from "@dcc-bs/communication.bs.js";
import { apiHandler } from "~~/server/utils/apiHanlder";
import { dummySummaryFetcher } from "~~/server/utils/dummyData";
import { summarizeSchema } from "#shared/types/summary";

export default apiHandler
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const body = await readBody(event);

        const result = summarizeSchema.safeParse(body);

        if (!result.success) {
            throw new ApiError(
                "summarize_invalid_input",
                400,
                result.error.message,
            );
        }

        return result.data;
    })
    .withDummyFetcher(dummySummaryFetcher)
    .build("/summarize");
