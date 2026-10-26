import { env } from "../config/env.js";

function serviceError(code) {
  return Object.assign(new Error(code), { code });
}

function chatEndpoint() {
  if (!env.lmStudioBaseUrl || !env.lmStudioModel) {
    throw serviceError("NOT_CONFIGURED");
  }

  let baseUrl;
  try {
    baseUrl = new URL(env.lmStudioBaseUrl);
  } catch {
    throw serviceError("NOT_CONFIGURED");
  }

  if (baseUrl.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname)) {
    throw serviceError("NOT_CONFIGURED");
  }

  return new URL("/v1/chat/completions", baseUrl);
}

export async function generateResponse(text) {
  const endpoint = chatEndpoint();
  let result;

  try {
    result = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.lmStudioModel,
        messages: [
          { role: "system", content: env.lmStudioSystemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 200,
        reasoning_effort: "none",
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw serviceError(error.name === "TimeoutError" || error.name === "AbortError" ? "TIMEOUT" : "UNAVAILABLE");
  }

  let data;
  try {
    data = await result.json();
  } catch {
    throw serviceError("UPSTREAM_ERROR");
  }

  if (!result.ok) {
    const message = String(data.error?.message || data.error || "");
    if (/failed to load model/i.test(message)) {
      throw serviceError("MODEL_LOAD_FAILED");
    }
    if (/no model.*loaded|no loaded model|model.*not loaded/i.test(message)) {
      throw serviceError("NO_MODEL_LOADED");
    }
    if (result.status === 404 || /model.*not found|invalid model|unknown model/i.test(message)) {
      throw serviceError("MODEL_NOT_FOUND");
    }
    throw serviceError("UPSTREAM_ERROR");
  }

  const response = data.choices?.[0]?.message?.content;
  if (typeof response !== "string" || !response.trim()) {
    throw serviceError("EMPTY_RESPONSE");
  }

  return response.trim();
}
