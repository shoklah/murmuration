import { STAGES } from '@/logic/stages.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** The stage dropdown: its options are STAGES (value = code, text = label), its placeholder is `stage…`. */
export function StageSelect({ value, onChange, label, disabled }: {
  value: string | null;
  onChange: (stageCode: string) => void;
  label: string;
  disabled?: boolean;
}) {
  // Radix shows the placeholder for an empty value.
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" aria-label={label}>
        <SelectValue placeholder="stage…" />
      </SelectTrigger>
      <SelectContent>
        {STAGES.map(stage => (
          <SelectItem key={stage.code} value={stage.code}>
            {stage.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
