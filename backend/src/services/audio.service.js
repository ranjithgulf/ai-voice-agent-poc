import { env } from "../config/env.js";

function serviceError(code) {
  return Object.assign(new Error(code), { code });
}

export async function transcribe(buffer, mimeType) {
  if (!env.geminiApiKey) {
    throw serviceError("NOT_CONFIGURED");
  }

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe the speech in this audio. Return only the spoken words, without commentary or formatting." },
              { inlineData: { mimeType, data: buffer.toString("base64") } },
            ],
          }],
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
  } catch (error) {
    throw serviceError(error.name === "TimeoutError" || error.name === "AbortError" ? "REQUEST_TIMEOUT" : "REQUEST_FAILED");
  }

  if (response.status === 401 || response.status === 403) {
    throw serviceError("AUTHENTICATION_FAILED");
  }
  if (response.status === 400 || response.status === 422) {
    throw serviceError("UNPROCESSABLE_AUDIO");
  }
  if (response.status === 429) {
    throw serviceError("RATE_LIMITED");
  }
  if (response.status === 503) {
    throw serviceError("UPSTREAM_UNAVAILABLE");
  }
  if (!response.ok) {
    throw serviceError("REQUEST_FAILED");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw serviceError("REQUEST_FAILED");
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw serviceError("UNPROCESSABLE_AUDIO");
  }

  return text;
}
