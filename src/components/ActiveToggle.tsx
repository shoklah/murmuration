import { Button } from '@/components/ui/button';

/** The ★ button, pressed (filled) when the student is active. */
export function ActiveToggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      aria-pressed={active}
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      ★
    </Button>
  );
}
