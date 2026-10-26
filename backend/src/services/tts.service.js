import { env } from "../config/env.js";
import { speachesEndpoint, speachesError } from "../utils/speaches.js";

export async function synthesizeSpeech(text) {
  if (!env.speachesTtsModel || !env.speachesTtsVoice) throw speachesError("NOT_CONFIGURED");
  const endpoint = speachesEndpoint("speech");

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.speachesTtsModel,
        input: text,
        voice: env.speachesTtsVoice,
        response_format: "wav",
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw speachesError(error.name === "TimeoutError" || error.name === "AbortError" ? "TIMEOUT" : "UNAVAILABLE");
  }

  if (response.status === 404) throw speachesError("MODEL_UNAVAILABLE");
  if (!response.ok) throw speachesError("UPSTREAM_ERROR");

  let buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch {
    throw speachesError("UPSTREAM_ERROR");
  }
  if (!buffer.length) throw speachesError("EMPTY_AUDIO");
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw speachesError("INVALID_AUDIO");
  }
  return buffer;
}
