import { Button } from "@/components/ui/button";

export function SampleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      Try sample booking <span aria-hidden="true" className="arrow">→</span>
    </Button>
  );
}
