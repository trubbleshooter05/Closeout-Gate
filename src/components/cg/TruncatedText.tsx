import { useLayoutEffect, useRef, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Single-line text that truncates with an ellipsis. The full value stays in the DOM for screen readers,
 * is exposed via `title` on hover, and — only when actually cut off — becomes focusable with a tooltip
 * so keyboard users can read it too.
 */
export function TruncatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setClipped(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  // The same element is always rendered (the tooltip is just kept closed when nothing is clipped),
  // so the observed node never remounts.
  return (
    <Tooltip open={clipped && open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span ref={ref} title={text} tabIndex={clipped ? 0 : undefined} className={cn("block truncate", clipped && "focus-ring rounded-sm", className)}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[320px] break-words text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}
