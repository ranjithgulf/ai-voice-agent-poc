import api from "@/utils/api";

export async function generateSpeech(text) {
  const response = await api.post("/tts/synthesize", { text }, {
    responseType: "blob",
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    let message = "Could not generate the voice response. Please try again.";
    try {
      const details = JSON.parse(await response.data.text());
      if (typeof details.error === "string") message = details.error;
    } catch {
      // Preserve a readable fallback for non-JSON proxy errors.
    }
    throw new Error(message);
  }

  if (response.data.size === 0 || !response.data.type.includes("audio")) {
    throw new Error("The speech service returned no playable audio.");
  }
  return response.data;
}
