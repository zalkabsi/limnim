import { Info } from "luxon";
import { AnalyzeRequestSchema, PolicyAnalysisSchema } from "@/lib/ai/schema";
import { supportedRuleEvidenceIssue } from "@/lib/ai/validate-analysis";
import type { PolicyRule } from "@/types/policy";

type ExtractArguments = {
  apiKey: string;
  policyText: string;
  propertyTimeZone: string;
  signal: AbortSignal;
};

type AnalyzeDependencies = {
  getApiKey: () => string | undefined;
  extract: (arguments_: ExtractArguments) => Promise<string>;
};

const MAX_REQUEST_BODY_BYTES = 100_000;

type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 400 | 413; code: string; message: string };

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (Number.isSafeInteger(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
      return {
        ok: false,
        status: 413,
        code: "request_too_large",
        message: "Policy text must be 15,000 characters or fewer.",
      };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, status: 400, code: "invalid_json", message: "The request was not valid JSON." };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return {
          ok: false,
          status: 413,
          code: "request_too_large",
          message: "Policy text must be 15,000 characters or fewer.",
        };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, code: "invalid_json", message: "The request was not valid JSON." };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, code: "invalid_json", message: "The request was not valid JSON." };
  }
}

export function createAnalyzeHandler({ getApiKey, extract }: AnalyzeDependencies) {
  return async function POST(request: Request): Promise<Response> {
    const parsedBody = await readJsonBody(request);
    if (!parsedBody.ok) return errorResponse(parsedBody.status, parsedBody.code, parsedBody.message);

    const input = AnalyzeRequestSchema.safeParse(parsedBody.body);
    if (!input.success) {
      const message = input.error.issues[0]?.message ?? "Add policy text and a property time zone.";
      return errorResponse(400, "invalid_request", message);
    }

    if (!Info.isValidIANAZone(input.data.propertyTimeZone)) {
      return errorResponse(400, "invalid_request", "Enter a valid property time zone, such as Asia/Tokyo.");
    }

    const apiKey = getApiKey()?.trim();
    if (!apiKey) {
      return errorResponse(503, "missing_api_key", "Live analysis needs OPENAI_API_KEY in .env.local. The sample works without it.");
    }

    try {
      const outputText = await extract({
        apiKey,
        policyText: input.data.policyText,
        propertyTimeZone: input.data.propertyTimeZone,
        signal: request.signal,
      });
      const parsedOutput: unknown = JSON.parse(outputText);
      const parsedAnalysis = PolicyAnalysisSchema.safeParse(parsedOutput);
      if (!parsedAnalysis.success) {
        return errorResponse(502, "invalid_provider_output", "The policy analysis could not be verified. Please try again.");
      }

      const unresolvedIssues = [...parsedAnalysis.data.unresolvedIssues];
      const rules: PolicyRule[] = [];
      for (const rule of parsedAnalysis.data.rules) {
        if (!rule.evidenceQuote || !input.data.policyText.includes(rule.evidenceQuote)) {
          unresolvedIssues.push("A proposed cancellation condition was omitted because its source quote could not be verified.");
          continue;
        }
        if (rule.status === "needs_clarification" && rule.issue) {
          unresolvedIssues.push(rule.issue);
          rules.push(rule);
          continue;
        }
        const evidenceIssue = supportedRuleEvidenceIssue(rule, input.data.propertyTimeZone);
        if (evidenceIssue) {
          unresolvedIssues.push(evidenceIssue);
          rules.push({ ...rule, status: "needs_clarification", issue: evidenceIssue });
          continue;
        }
        rules.push(rule);
      }
      if (rules.length === 0 && unresolvedIssues.length === 0) {
        unresolvedIssues.push("No explicit cancellation deadline and penalty could be verified from the submitted policy.");
      }

      const analysis = PolicyAnalysisSchema.parse({
        rules,
        unresolvedIssues: [...new Set(unresolvedIssues)],
      });
      return Response.json({ analysis });
    } catch {
      return errorResponse(502, "analysis_failed", "We couldn't analyze this policy. Check your connection and try again.");
    }
  };
}
