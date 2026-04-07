"use client";

import { FeatureHint } from "@/components/feature-hint";

export function CmdKHint() {
  return (
    <FeatureHint
      id="cmd-k-intro"
      message='Press Cmd+K (or Ctrl+K) to search, navigate, or give AI commands in natural language. Try: "create intake for 10 laptops from Swisscom"'
    />
  );
}
