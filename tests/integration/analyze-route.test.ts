import { describe, expect, it, vi } from "vitest";
import { createAnalyzeHandler } from "@/lib/ai/analyze-handler";

const policyText = "Cancel before 2026-11-20 at 6:00 PM for no penalty; after that, a 50% penalty applies.";
const supportedOutput = {
  rules: [{
    id: "deadline-1",
    deadlineLocal: "2026-11-20T18:00",
    penaltyPercent: "50",
    evidenceQuote: "Cancel before 2026-11-20 at 6:00 PM for no penalty; after that, a 50% penalty applies.",
    interpretation: "A 50% penalty begins at the first deadline.",
    status: "supported",
    issue: "",
  }],
  unresolvedIssues: [],
};

function request(body: unknown) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  it("returns validated rules without booking values and forwards request cancellation", async () => {
    const analyzeRequest = request({ policyText, propertyTimeZone: "Asia/Tokyo" });
    const extract = vi.fn(async (arguments_: { apiKey: string; policyText: string; propertyTimeZone: string; signal: AbortSignal }) => {
      expect(Object.keys(arguments_).sort()).toEqual(["apiKey", "policyText", "propertyTimeZone", "signal"]);
      expect(arguments_.signal).toBe(analyzeRequest.signal);
      return JSON.stringify(supportedOutput);
    });
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract });
    const response = await handler(analyzeRequest);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ analysis: supportedOutput });
    expect(extract).toHaveBeenCalledOnce();
    expect(extract.mock.calls[0]?.[0]).toEqual({
      apiKey: "test-key",
      policyText,
      propertyTimeZone: "Asia/Tokyo",
      signal: analyzeRequest.signal,
    });
  });

  it("rejects malformed provider output", async () => {
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract: async () => "not JSON" });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "analysis_failed" } });
  });

  it("omits rules whose evidence quote does not occur verbatim in the policy", async () => {
    const responseWithInventedQuote = {
      ...supportedOutput,
      rules: [{ ...supportedOutput.rules[0], evidenceQuote: "The policy guarantees a full refund" }],
    };
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract: async () => JSON.stringify(responseWithInventedQuote) });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.rules).toEqual([]);
    expect(body.analysis.unresolvedIssues[0]).toMatch(/source quote could not be verified/i);
  });

  it("downgrades a model deadline that does not match its exact source quote", async () => {
    const mismatchedOutput = {
      ...supportedOutput,
      rules: [{ ...supportedOutput.rules[0], deadlineLocal: "2026-11-21T18:00" }],
    };
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract: async () => JSON.stringify(mismatchedOutput) });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.rules[0]).toMatchObject({ status: "needs_clarification" });
    expect(body.analysis.unresolvedIssues[0]).toMatch(/complete date and time/i);
  });

  it("explains when the provider returns no usable cancellation rule", async () => {
    const handler = createAnalyzeHandler({
      getApiKey: () => "test-key",
      extract: async () => JSON.stringify({ rules: [], unresolvedIssues: [] }),
    });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      analysis: {
        rules: [],
        unresolvedIssues: ["No explicit cancellation deadline and penalty could be verified from the submitted policy."],
      },
    });
  });

  it("does not call the provider when no API key is configured", async () => {
    const extract = vi.fn(async () => JSON.stringify(supportedOutput));
    const handler = createAnalyzeHandler({ getApiKey: () => undefined, extract });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "missing_api_key" } });
    expect(extract).not.toHaveBeenCalled();
  });

  it("returns a retryable error after provider failure without exposing policy text", async () => {
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract: async () => { throw new Error(policyText); } });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));
    const responseText = await response.text();

    expect(response.status).toBe(502);
    expect(responseText).not.toContain(policyText);
    expect(responseText).toContain("analysis_failed");
  });

  it("gives actionable guidance when the provider account has exhausted its credits", async () => {
    const providerError = Object.assign(new Error("credit_balance_exhausted"), {
      status: 429,
      code: "credit_balance_exhausted",
    });
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract: async () => { throw providerError; } });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));
    const responseText = await response.text();

    expect(response.status).toBe(503);
    expect(responseText).toContain("provider_quota_exhausted");
    expect(responseText).toContain("no available API credits");
    expect(responseText).not.toContain("credit_balance_exhausted");
    expect(responseText).not.toContain(policyText);
  });

  it("rejects booking amounts in the analysis request", async () => {
    const extract = vi.fn(async () => JSON.stringify(supportedOutput));
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo", amount: "1200", currency: "USD" }));

    expect(response.status).toBe(400);
    expect(extract).not.toHaveBeenCalled();
  });

  it("accepts the full 15,000-character policy limit when UTF-8 text is multibyte", async () => {
    const extract = vi.fn(async () => JSON.stringify({ rules: [], unresolvedIssues: ["No explicit cancellation rule."] }));
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract });
    const longPolicy = "東".repeat(15_000);
    const response = await handler(request({ policyText: longPolicy, propertyTimeZone: "Asia/Tokyo" }));

    expect(response.status).toBe(200);
    expect(extract).toHaveBeenCalledOnce();
  });

  it("rejects an oversized streamed body even when it has no Content-Length header", async () => {
    const extract = vi.fn(async () => JSON.stringify(supportedOutput));
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract });
    const body = JSON.stringify({ policyText: "x".repeat(100_001), propertyTimeZone: "Asia/Tokyo" });
    const streamedRequest = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const response = await handler(streamedRequest);

    expect(response.status).toBe(413);
    expect(extract).not.toHaveBeenCalled();
  });

  it("keeps provider and per-rule clarification issues within the combined response limit", async () => {
    const providerIssues = Array.from({ length: 40 }, (_, index) => `Policy issue ${index + 1} needs review.`);
    const clarificationRules = Array.from({ length: 20 }, (_, index) => ({
      id: `unclear-rule-${index + 1}`,
      deadlineLocal: "",
      penaltyPercent: "",
      evidenceQuote: policyText,
      interpretation: "This cancellation term needs review.",
      status: "needs_clarification",
      issue: `Cancellation condition ${index + 1} needs clarification.`,
    }));
    const handler = createAnalyzeHandler({
      getApiKey: () => "test-key",
      extract: async () => JSON.stringify({ rules: clarificationRules, unresolvedIssues: providerIssues }),
    });

    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.unresolvedIssues).toHaveLength(60);
    expect(body.analysis.rules).toHaveLength(20);
  });
});
