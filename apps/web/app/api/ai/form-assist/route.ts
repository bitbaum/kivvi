import { createFormAssistHandler } from "@fleet/ai-forms/server";
import { AI_FORMS } from "@/lib/config/ai-forms";
import { callAIProvider, isAIConfigured } from "@/lib/ai/call-provider";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * One route for every AI-assisted form in the app.
 *
 * Adding assistance to a new form means adding it to AI_FORMS — nothing here
 * changes. The field registry stays server-side on purpose: the client names a
 * form, never the fields, so it cannot widen what the model may write.
 *
 * The provider is this app's own `callAIProvider`, the same one the extraction
 * actions and the chat widget use, so form assistance inherits the existing
 * key handling and provider fallback instead of introducing a second policy.
 */
export const POST = createFormAssistHandler({
  targets: AI_FORMS,

  authorize: async () => {
    const session = await auth();
    if (!session?.user) {
      return { ok: false, status: 401, error: "Sign in to use the assistant." };
    }
    // Fail with a clear reason rather than letting `complete` return null and
    // surface as an unexplained parse failure.
    if (!isAIConfigured()) {
      return {
        ok: false,
        status: 503,
        error: "No AI provider is configured for this deployment.",
      };
    }
    return { ok: true };
  },

  complete: async ({ system, prompt, maxTokens }) => {
    const text = await callAIProvider(system, prompt, maxTokens);
    if (text === null) {
      throw new Error("No AI provider is configured.");
    }
    return text;
  },
});
