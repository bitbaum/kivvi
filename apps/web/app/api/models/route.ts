import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllModels } from "@kivvi/ai";
import { logger } from "@/lib/logger";

/** Only show models from providers that have credentials configured. */
function getConfiguredProviders(): Set<string> {
  const providers = new Set<string>();
  if (process.env.GROQ_API_KEY) providers.add("groq");
  if (process.env.XAI_API_KEY) providers.add("xai");
  if (process.env.OPENROUTER_API_KEY) providers.add("openrouter");
  if (process.env.ANTHROPIC_API_KEY) providers.add("anthropic");
  if (process.env.OLLAMA_BASE_URL) providers.add("ollama");
  return providers;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configured = getConfiguredProviders();
    const models = getAllModels().filter((m) => configured.has(m.providerId));
    return NextResponse.json({ models });
  } catch (error) {
    logger.error("Failed to get models", error);
    return NextResponse.json(
      { error: "Failed to get models" },
      { status: 500 },
    );
  }
}
