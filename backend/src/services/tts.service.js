import { env } from "../config/env.js";

function serviceError(code) {
  return Object.assign(new Error(code), { code });
}

export async function synthesizeSpeech(text) {
  if (!env.geminiApiKey) throw serviceError("NOT_CONFIGURED");

  let response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey,
      },
      body: JSON.stringify({
        model: env.geminiTtsModel,
        input: [{
          type: "user_input",
          content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: "warm and conversational" }] }],
        }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice: env.geminiTtsVoice }] },
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw serviceError(error.name === "TimeoutError" || error.name === "AbortError" ? "TIMEOUT" : "UNAVAILABLE");
  }

  if (response.status === 401 || response.status === 403) throw serviceError("AUTHENTICATION_FAILED");
  if (response.status === 429) throw serviceError("RATE_LIMITED");
  if (response.status === 503) throw serviceError("UPSTREAM_UNAVAILABLE");
  if (response.status === 400 || response.status === 404) throw serviceError("MODEL_UNAVAILABLE");
  if (!response.ok) throw serviceError("UPSTREAM_ERROR");

  let data;
  try {
    data = await response.json();
  } catch {
    throw serviceError("UPSTREAM_ERROR");
  }

  const audio = data.steps?.flatMap((step) => step.type === "model_output" ? step.content || [] : [])
    .filter((item) => item.type === "audio" && typeof item.data === "string")
    .at(-1);
  if (!audio) throw serviceError("EMPTY_AUDIO");

  const buffer = Buffer.from(audio.data, "base64");
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw serviceError("INVALID_AUDIO");
  }
  return buffer;
}
