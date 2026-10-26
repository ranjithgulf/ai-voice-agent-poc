import { synthesizeSpeech } from "../services/tts.service.js";

const SERVICE_ERRORS = {
  NOT_CONFIGURED: [503, "Gemini text-to-speech is not configured on the backend."],
  AUTHENTICATION_FAILED: [502, "Gemini rejected the API key for speech generation."],
  RATE_LIMITED: [429, "Gemini speech generation request limit reached. Please try again later."],
  UPSTREAM_UNAVAILABLE: [503, "Gemini speech generation is temporarily unavailable. Please try again shortly."],
  MODEL_UNAVAILABLE: [502, "The configured Gemini text-to-speech model is unavailable. Check GEMINI_TTS_MODEL."],
  TIMEOUT: [504, "Gemini took too long to generate speech. Please try again."],
  UNAVAILABLE: [502, "Could not connect to Gemini for speech generation. Please try again."],
  UPSTREAM_ERROR: [502, "Gemini could not generate speech right now. Please try again."],
  EMPTY_AUDIO: [502, "Gemini returned no speech audio. Please try again."],
  INVALID_AUDIO: [502, "Gemini returned audio in an unexpected format. Please try again."],
};

export async function synthesize(req, res) {
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "AI response text is required." });
  }
  if (text.length > 4000) {
    return res.status(400).json({ error: "AI response is too long. Maximum length is 4,000 characters." });
  }

  try {
    const audio = await synthesizeSpeech(text.trim());
    res.set("Cache-Control", "no-store");
    res.type("audio/wav");
    return res.send(audio);
  } catch (error) {
    const known = SERVICE_ERRORS[error.code];
    if (known) return res.status(known[0]).json({ error: known[1] });
    console.error("Speech generation failed:", error);
    return res.status(500).json({ error: "Something went wrong while generating speech." });
  }
}
