import api from "@/utils/api";

export async function transcribeAudio(file) {
  const form = new FormData();
  form.append("audio", file);

  const { data } = await api.post("/audio/transcribe", form);
  return data;
}
