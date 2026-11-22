import { ArrowRightLeft } from 'lucide-react';
import { STAGES } from '@/logic/stages.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * The stage dropdown: its options are STAGES (value = code, text = label), its placeholder is `Stage…`.
 * `compact` draws the trigger as a 28 px icon button (two arrows, `label` as its tooltip) that opens the same list.
 */
export function StageSelect({ value, onChange, label, disabled, compact }: {
  value: string | null;
  onChange: (stageCode: string) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  // Radix shows the placeholder for an empty value.
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      {compact ? (
        <SelectTrigger
          size="sm"
          aria-label={label}
          title={label}
          className="data-[size=sm]:h-7 w-7 justify-center border-transparent bg-transparent p-0 text-muted-foreground hover:bg-primary/9 hover:text-foreground [&>svg:last-child]:hidden"
        >
          <ArrowRightLeft />
        </SelectTrigger>
      ) : (
        <SelectTrigger size="sm" aria-label={label} className="w-full data-[size=sm]:h-7">
          <SelectValue placeholder="Stage…" />
        </SelectTrigger>
      )}
      <SelectContent position={compact ? 'popper' : 'item-aligned'}>
        {STAGES.map(stage => (
          <SelectItem key={stage.code} value={stage.code}>
            {stage.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
