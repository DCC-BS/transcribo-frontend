import { apiHandler } from "~~/server/utils/apiHanlder";

export default apiHandler.withMethod("GET").build("/task/[r:task_id]/status");
