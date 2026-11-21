import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Text held to two lines, which expands and collapses on click when it does not fit. */
export function ClampedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  // Measured only while clamped, and again whenever the width changes (the side panel can be dragged wider).
  // `overflows` is a dependency because it swaps the element between a span and a button.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || open) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text, open, overflows]);

  const classes = cn('wrap-anywhere', !open && 'line-clamp-2', className);
  if (!overflows) {
    return <span ref={ref} className={classes}>{text}</span>;
  }
  return (
    <button
      ref={el => { ref.current = el; }}
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn(
        'cursor-pointer rounded-sm text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
        classes,
      )}
    >
      {text}
    </button>
  );
}
