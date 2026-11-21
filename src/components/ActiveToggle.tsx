import { Toggle } from '@/components/ui/toggle';

/** The ★ button, pressed when the student is active. */
export function ActiveToggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <Toggle size="sm" pressed={active} onPressedChange={() => onToggle()} aria-label={label} title={label}>
      ★
    </Toggle>
  );
}
