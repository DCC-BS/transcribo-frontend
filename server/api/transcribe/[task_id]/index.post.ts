import { apiHandler } from "~~/server/utils/apiHanlder";
import { dummyTranscriptionResultFetcher } from "~~/server/utils/dummyData";

export default apiHandler
    .withMethod("POST")
    .withBodyProvider(async (event) => await readBody(event))
    // The backend streams JSON Lines (post-processing progress, then the
    // result); pass them through as they arrive instead of buffering.
    .withRawFetcher()
    .withDummyFetcher(dummyTranscriptionResultFetcher)
    .build("/task/[r:task_id]/result");
