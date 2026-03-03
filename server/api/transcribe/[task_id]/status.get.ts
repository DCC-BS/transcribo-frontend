import { apiHandler } from "~~/server/utils/apiHanlder";
import { dummyTaskStatusFetcher } from "~~/server/utils/dummyData";

export default apiHandler
    .withMethod("GET")
    .withDummyFetcher(dummyTaskStatusFetcher)
    .build("/task/[r:task_id]/status");
