import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** The star button, 28 px square: lit (filled, star yellow) and pressed when the student is active. */
export function ActiveToggle({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-pressed={active}
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <Star className={active ? 'fill-current text-star' : 'text-muted-foreground'} />
    </Button>
  );
}
