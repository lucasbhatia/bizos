"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600">
            ?
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
