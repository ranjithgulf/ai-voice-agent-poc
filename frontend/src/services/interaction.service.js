import api from "@/utils/api";

export async function saveInteraction(inputAudio, transcription, aiResponseText, responseAudio) {
  const form = new FormData();
  form.append("inputAudio", inputAudio, inputAudio.name);
  form.append("transcription", transcription);
  form.append("aiResponseText", aiResponseText);
  form.append("responseAudio", responseAudio, "ai-response.wav");

  const { data } = await api.post("/interactions", form);
  return data;
}

export async function listSavedInteractions() {
  const { data } = await api.get("/interactions");
  return data.interactions;
}

export function savedAudioUrl(id, kind) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
  return `${baseUrl}/interactions/${encodeURIComponent(id)}/audio/${kind}`;
}
