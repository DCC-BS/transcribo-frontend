import { ApiError } from "@dcc-bs/communication.bs.js";
import { z } from "zod";
import { apiHandler } from "~~/server/utils/apiHanlder";

const summarizeSchema = z.object({
    transcript: z.string()
});

export default apiHandler
    .withMethod("POST")
    .withBodyProvider(async (event) => {
        const inputData = await readFormData(event);

        const result = summarizeSchema.safeParse(inputData);

        if (!result.success) {
            throw new ApiError("summarize_invalid_input", 400, result.error.message);
        }

        return result.data;
    })
    .build("/summarize");
