import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod/v4";
import { db } from "@/lib/server/db";
import { env, features } from "@/lib/server/env";
import type { PromptDef } from "./prompts";

export type AIService = "workout_planner" | "food_vision" | "nutrition" | "coach";
export type AIResult<T> = { ok: true; data: T; requestId: string } | { ok: false; code: "not_configured" | "invalid_output" | "refused" | "rate_limited" | "unavailable"; requestId?: string };

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: env.anthropicKey!, maxRetries: 2, timeout: 120_000 }));

type Content = Anthropic.Beta.Messages.BetaContentBlockParam[];

/**
 * Runs one structured-output request. The model output is parsed with `schema`
 * (the source of truth) and optionally checked by `validate` for domain rules.
 * Invalid output is retried once with the validation errors, then fails safely.
 * Only metadata is logged — never prompts, images or personal data.
 */
export async function runStructured<S extends z.ZodType>(opts: {
  service: AIService;
  prompt: PromptDef;
  schema: S;
  content: Content;
  userId: string | null;
  effort?: "low" | "medium" | "high";
  validate?: (data: z.infer<S>) => string[];
  maxTokens?: number;
}): Promise<AIResult<z.infer<S>>> {
  if (!features.ai) return { ok: false, code: "not_configured" };
  const started = Date.now();
  const request = await db.aIRequest.create({
    data: { userId: opts.userId, service: opts.service, promptId: opts.prompt.id, promptVersion: opts.prompt.version, model: env.aiModel, status: "error" },
  });
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: opts.content }];
  let inputTokens = 0, outputTokens = 0;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await getClient().beta.messages.create({
        model: env.aiModel,
        max_tokens: opts.maxTokens ?? 16000,
        system: opts.prompt.system,
        messages,
        thinking: { type: "adaptive" },
        output_config: { effort: opts.effort ?? "medium", format: zodOutputFormat(opts.schema) as never },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      inputTokens += res.usage.input_tokens;
      outputTokens += res.usage.output_tokens;
      if (res.stop_reason === "refusal") {
        await finish(request.id, "error", attempt, inputTokens, outputTokens, started, "refusal");
        return { ok: false, code: "refused", requestId: request.id };
      }
      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      let issues: string[];
      let data: z.infer<S> | null = null;
      try {
        const parsed = opts.schema.safeParse(JSON.parse(text));
        if (parsed.success) {
          data = parsed.data;
          issues = opts.validate?.(parsed.data) ?? [];
        } else issues = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`);
      } catch {
        issues = ["Response was not valid JSON"];
      }
      if (data && issues.length === 0) {
        await finish(request.id, "success", attempt, inputTokens, outputTokens, started, null);
        await db.aIResponse.create({ data: { requestId: request.id, payload: data as never } });
        return { ok: true, data, requestId: request.id };
      }
      if (attempt === 2) break;
      messages.push({ role: "assistant", content: text || "{}" });
      messages.push({ role: "user", content: `That output was rejected by validation:\n- ${issues.join("\n- ")}\nReturn a corrected JSON object.` });
    } catch (err) {
      const code = err instanceof Anthropic.RateLimitError ? "rate_limited" : "unavailable";
      await finish(request.id, "error", attempt, inputTokens, outputTokens, started, err instanceof Anthropic.APIError ? String(err.status) : "network");
      return { ok: false, code, requestId: request.id };
    }
  }
  await finish(request.id, "invalid_output", 2, inputTokens, outputTokens, started, "validation");
  return { ok: false, code: "invalid_output", requestId: request.id };
}

async function finish(id: string, status: string, attempts: number, inputTokens: number, outputTokens: number, started: number, errorCode: string | null) {
  await db.aIRequest.update({ where: { id }, data: { status, attempts, inputTokens, outputTokens, latencyMs: Date.now() - started, errorCode } });
}

export const imageBlock = (base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Anthropic.Beta.Messages.BetaImageBlockParam => ({
  type: "image", source: { type: "base64", media_type: mediaType, data: base64 },
});
export const textBlock = (text: string): Anthropic.Beta.Messages.BetaTextBlockParam => ({ type: "text", text });
