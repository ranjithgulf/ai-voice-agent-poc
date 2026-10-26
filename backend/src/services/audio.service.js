import { env } from "../config/env.js";
import { speachesEndpoint, speachesError } from "../utils/speaches.js";

export async function transcribe(buffer, mimeType, filename) {
  if (!env.speachesSttModel) throw speachesError("NOT_CONFIGURED");
  const endpoint = speachesEndpoint("transcriptions");
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), filename);
  form.append("model", env.speachesSttModel);
  form.append("response_format", "json");

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw speachesError(error.name === "TimeoutError" || error.name === "AbortError" ? "REQUEST_TIMEOUT" : "UNAVAILABLE");
  }

  if (response.status === 404) throw speachesError("MODEL_UNAVAILABLE");
  if (response.status === 413 || response.status === 422) throw speachesError("UNPROCESSABLE_AUDIO");
  if (!response.ok) throw speachesError("REQUEST_FAILED");

  let data;
  try {
    data = await response.json();
  } catch {
    throw speachesError("REQUEST_FAILED");
  }

  const text = data?.text?.trim();
  if (!text) throw speachesError("EMPTY_TRANSCRIPTION");
  return text;
}
