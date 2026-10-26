import api from "@/utils/api";

export async function generateAIResponse(transcription) {
  const { data } = await api.post("/ai/chat", { text: transcription });
  return data;
}
