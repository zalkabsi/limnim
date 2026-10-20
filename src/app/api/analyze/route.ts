import { extractPolicyWithOpenAI } from "@/lib/ai/extract-policy";
import { createAnalyzeHandler } from "@/lib/ai/analyze-handler";

export const runtime = "nodejs";

const analyze = createAnalyzeHandler({
  getApiKey: () => process.env.OPENAI_API_KEY,
  extract: ({ apiKey, policyText, propertyTimeZone, signal }) => extractPolicyWithOpenAI({
    apiKey,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
    policyText,
    propertyTimeZone,
    signal,
  }),
});

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_SAMPLE_DEMO === "true") {
    return Response.json({
      error: {
        code: "sample_demo_only",
        message: "Live policy analysis is unavailable in this public sample demo. Explore the fictional Tokyo booking instead.",
      },
    }, { status: 503 });
  }

  return analyze(request);
}
