import { Card } from "@/components/ui/card";
import type { PolicyRule } from "@/types/policy";

export function PolicyEvidence({
  rules,
  unresolvedIssues = [],
  sourceLabel = "Quoted from the policy",
}: {
  rules: PolicyRule[];
  unresolvedIssues?: string[];
  sourceLabel?: string;
}) {
  return (
    <Card className="evidence-card" aria-labelledby="evidence-title">
      <div className="evidence-heading">
        <h3 id="evidence-title">Policy evidence</h3>
        <span>{sourceLabel}</span>
      </div>
      {rules.length === 0 && <p className="evidence-empty">No deadline has enough verified detail to calculate yet.</p>}
      {rules.map((rule, index) => (
        <article className="evidence-item" key={rule.id}>
          <span className="evidence-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <blockquote>“{rule.evidenceQuote}”</blockquote>
            <p>{rule.interpretation}</p>
            {rule.status === "supported" ? (
              <span className="evidence-status"><span aria-hidden="true">✓</span> Supported rule · {rule.penaltyPercent}% penalty applies {rule.deadlineBoundary === "exclusive" ? "after" : "on or after"} this deadline</span>
            ) : (
              <span className="evidence-status evidence-status-warning"><span aria-hidden="true">!</span> Needs clarification{rule.issue ? ` · ${rule.issue}` : ""}</span>
            )}
          </div>
        </article>
      ))}
      {unresolvedIssues.length > 0 && (
        <div className="unresolved-box" role="status">
          <strong>Needs a closer look</strong>
          <ul>{unresolvedIssues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>
        </div>
      )}
    </Card>
  );
}
