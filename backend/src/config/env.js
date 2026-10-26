import "dotenv/config";

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
  geminiTtsModel: process.env.GEMINI_TTS_MODEL?.trim() || "gemini-3.8-flash-lite-tts",
  geminiTtsVoice: process.env.GEMINI_TTS_VOICE?.trim() || "Kore",
  lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL?.trim(),
  lmStudioModel: process.env.LM_STUDIO_MODEL?.trim(),
  lmStudioSystemPrompt: process.env.LM_STUDIO_SYSTEM_PROMPT?.trim() ||
    "You are a helpful voice assistant. Respond naturally and concisely in conversational language. Avoid markdown and lists unless needed.",
  port: Number(process.env.PORT) || 3001,
};
