import { generateResponse } from "../services/ai.service.js";

const SERVICE_ERRORS = {
  NOT_CONFIGURED: [503, "LM Studio is not configured. Set its local URL and model in the backend environment."],
  UNAVAILABLE: [503, "LM Studio is unavailable. Start its local server and try again."],
  TIMEOUT: [504, "LM Studio took too long to respond. Please try again."],
  MODEL_NOT_FOUND: [502, "The configured LM Studio model was not found. Check LM_STUDIO_MODEL."],
  NO_MODEL_LOADED: [503, "No model is loaded in LM Studio. Load the configured model and try again."],
  MODEL_LOAD_FAILED: [503, "LM Studio could not load the configured model. Check its load settings and logs."],
  UPSTREAM_ERROR: [502, "LM Studio could not generate a response. Please try again."],
  EMPTY_RESPONSE: [502, "LM Studio returned an empty response. Please try again."],
};

export async function chat(req, res) {
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Transcription text is required in the text field." });
  }
  if (text.length > 4000) {
    return res.status(400).json({ error: "Transcription is too long. Maximum length is 4,000 characters." });
  }

  try {
    const response = await generateResponse(text.trim());
    return res.json({ response });
  } catch (error) {
    const knownError = SERVICE_ERRORS[error.code];
    if (knownError) {
      return res.status(knownError[0]).json({ error: knownError[1] });
    }
    console.error("AI response generation failed:", error);
    return res.status(500).json({ error: "Something went wrong while generating the AI response." });
  }
}
