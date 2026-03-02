import { z } from "zod";

export const summaryTypeSchema = z.enum([
    "verhandlungsprotokoll",
    "kurzprotokoll",
    "ergebnisprotokoll",
]);

export type SummaryType = z.infer<typeof summaryTypeSchema>;

export const summarizeSchema = z.object({
    transcript: z.string(),
    summary_type: summaryTypeSchema,
    language: z.string().optional(),
});

export type SummarizeRequest = z.infer<typeof summarizeSchema>;
