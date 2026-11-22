import { Toggle } from '@/components/ui/toggle';

/** The ★ button, pressed when the student is active. */
export function ActiveToggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <Toggle
      variant="outline"
      size="sm"
      className="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground"
      pressed={active}
      onPressedChange={() => onToggle()}
      aria-label={label}
      title={label}
    >
      ★
    </Toggle>
  );
}
