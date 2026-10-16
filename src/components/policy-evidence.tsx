import { Card } from "@/components/ui/card";
import type { PolicyRule } from "@/types/policy";

export function PolicyEvidence({ rules }: { rules: PolicyRule[] }) {
  return (
    <Card className="evidence-card" aria-labelledby="evidence-title">
      <div className="evidence-heading">
        <h3 id="evidence-title">Policy evidence</h3>
        <span>Quoted from the sample policy</span>
      </div>
      {rules.map((rule, index) => (
        <article className="evidence-item" key={rule.id}>
          <span className="evidence-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <blockquote>“{rule.evidenceQuote}”</blockquote>
            <p>{rule.interpretation}</p>
            <span className="evidence-status"><span aria-hidden="true">✓</span> Supported rule</span>
          </div>
        </article>
      ))}
    </Card>
  );
}
