import "dotenv/config";

export const env = {
  speachesBaseUrl: process.env.SPEACHES_BASE_URL?.trim(),
  speachesSttModel: process.env.SPEACHES_STT_MODEL?.trim(),
  speachesTtsModel: process.env.SPEACHES_TTS_MODEL?.trim(),
  speachesTtsVoice: process.env.SPEACHES_TTS_VOICE?.trim(),
  lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL?.trim(),
  lmStudioModel: process.env.LM_STUDIO_MODEL?.trim(),
  lmStudioSystemPrompt: process.env.LM_STUDIO_SYSTEM_PROMPT?.trim() ||
    "You are a helpful voice assistant. Respond naturally and concisely in conversational language. Avoid markdown and lists unless needed.",
  databaseUrl: process.env.DATABASE_URL?.trim(),
  port: Number(process.env.PORT) || 3001,
};
