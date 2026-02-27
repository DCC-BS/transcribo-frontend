import { apiHandler } from "~~/server/utils/apiHanlder";
import { dummyTranscriptionResultFetcher } from "~~/server/utils/dummyData";

export default apiHandler
    .withMethod("GET")
    .withDummyFetcher(dummyTranscriptionResultFetcher)
    .build("/task/[r:task_id]/result");
