import { synthesizeSpeech } from "../services/tts.service.js";

const SERVICE_ERRORS = {
  NOT_CONFIGURED: [503, "Speaches TTS is not configured. Check its local URL, model, and voice in the backend environment."],
  MODEL_UNAVAILABLE: [503, "The configured Speaches TTS model is not installed. Check SPEACHES_TTS_MODEL."],
  TIMEOUT: [504, "Speaches took too long to generate speech. Please try again."],
  UNAVAILABLE: [503, "Speaches is unavailable. Start the local server and try again."],
  UPSTREAM_ERROR: [502, "Speaches could not generate speech. Check the TTS model and voice."],
  EMPTY_AUDIO: [502, "Speaches returned no speech audio. Please try again."],
  INVALID_AUDIO: [502, "Speaches returned audio in an unexpected format. Please try again."],
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
    const started = Date.now();
    console.info("Speaches TTS started");
    const audio = await synthesizeSpeech(text.trim());
    console.info(`Speaches TTS completed in ${Date.now() - started} ms`);
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
