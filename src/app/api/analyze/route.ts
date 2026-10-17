import { extractPolicyWithOpenAI } from "@/lib/ai/extract-policy";
import { createAnalyzeHandler } from "@/lib/ai/analyze-handler";

export const runtime = "nodejs";

export const POST = createAnalyzeHandler({
  getApiKey: () => process.env.OPENAI_API_KEY,
  extract: ({ apiKey, policyText, propertyTimeZone, signal }) => extractPolicyWithOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
    policyText,
    propertyTimeZone,
    signal,
  }),
});
