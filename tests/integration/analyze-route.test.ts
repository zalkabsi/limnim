import { describe, expect, it, vi } from "vitest";
import { createAnalyzeHandler } from "@/lib/ai/analyze-handler";

const policyText = "Cancel before 2026-11-20 at 6:00 PM for no penalty; after that, a 50% penalty applies.";
const supportedOutput = {
  rules: [{
    id: "deadline-1",
    deadlineLocal: "2026-11-20T18:00",
    penaltyPercent: "50",
    evidenceQuote: "after that, a 50% penalty applies",
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
  it("returns validated rules and sends only policy text and property time zone to the provider", async () => {
    const extract = vi.fn(async (arguments_: { apiKey: string; policyText: string; propertyTimeZone: string }) => {
      expect(Object.keys(arguments_).sort()).toEqual(["apiKey", "policyText", "propertyTimeZone"]);
      return JSON.stringify(supportedOutput);
    });
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ analysis: supportedOutput });
    expect(extract).toHaveBeenCalledOnce();
    expect(extract.mock.calls[0]?.[0]).toEqual({
      apiKey: "test-key",
      policyText,
      propertyTimeZone: "Asia/Tokyo",
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

  it("rejects booking amounts in the analysis request", async () => {
    const extract = vi.fn(async () => JSON.stringify(supportedOutput));
    const handler = createAnalyzeHandler({ getApiKey: () => "test-key", extract });
    const response = await handler(request({ policyText, propertyTimeZone: "Asia/Tokyo", amount: "1200", currency: "USD" }));

    expect(response.status).toBe(400);
    expect(extract).not.toHaveBeenCalled();
  });
});
