import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Text held to two lines, which expands and collapses on click when it does not fit. */
export function ClampedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  // Measured only while clamped, and again whenever the width changes (the side panel can be dragged wider).
  // `overflows` is a dependency because the measured span changes: alone, or inside the button.
  // `ref` stays on the element carrying the clamp: the button does not clip, so it would always measure as fitting.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || open) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text, open, overflows]);

  const clamp = cn('wrap-anywhere', !open && 'line-clamp-2');
  if (!overflows) {
    return <span ref={ref} className={cn(clamp, className)}>{text}</span>;
  }
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex cursor-pointer items-end gap-1 rounded-sm text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <span ref={ref} className={cn('min-w-0 flex-1', clamp)}>{text}</span>
      <Chevron className="mb-0.5 size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
