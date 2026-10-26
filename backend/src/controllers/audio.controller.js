import { transcribe } from "../services/audio.service.js";

const AUDIO_TYPES = new Map([
  [".wav", { types: ["audio/wav", "audio/x-wav", "audio/wave"], geminiType: "audio/wav" }],
  [".mp3", { types: ["audio/mpeg", "audio/mp3"], geminiType: "audio/mp3" }],
  [".m4a", { types: ["audio/mp4", "audio/x-m4a", "audio/m4a"], geminiType: "audio/m4a" }],
  [".ogg", { types: ["audio/ogg"], geminiType: "audio/ogg" }],
  [".flac", { types: ["audio/flac", "audio/x-flac"], geminiType: "audio/flac" }],
  [".webm", { types: ["audio/webm"], geminiType: "audio/webm" }],
]);

const SERVICE_ERRORS = {
  NOT_CONFIGURED: [503, "Gemini API key is not configured on the backend."],
  AUTHENTICATION_FAILED: [502, "Gemini rejected the API key. Check the backend configuration."],
  REQUEST_FAILED: [502, "Gemini could not transcribe the audio right now. Please try again."],
  REQUEST_TIMEOUT: [504, "Gemini took too long to transcribe the audio. Please try again."],
  RATE_LIMITED: [429, "Gemini request limit reached. Please try again later."],
  UPSTREAM_UNAVAILABLE: [503, "Gemini is temporarily overloaded. Please try again shortly."],
  UNPROCESSABLE_AUDIO: [422, "Gemini could not process this audio file. Try another recording."],
};

export async function transcribeAudio(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Select an audio file to transcribe." });
  }

  if (!req.file.size) {
    return res.status(400).json({ error: "The audio file is empty." });
  }

  const extension = req.file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  const format = AUDIO_TYPES.get(extension);
  if (!format || !format.types.includes(req.file.mimetype.toLowerCase())) {
    return res.status(415).json({ error: "Unsupported audio format. Use WAV, MP3, M4A, OGG, FLAC, or WebM." });
  }

  try {
    const transcription = await transcribe(req.file.buffer, format.geminiType);
    return res.json({ transcription });
  } catch (error) {
    const knownError = SERVICE_ERRORS[error.code];
    if (knownError) {
      return res.status(knownError[0]).json({ error: knownError[1] });
    }

    console.error("Audio transcription failed:", error);
    return res.status(500).json({ error: "Something went wrong while transcribing the audio." });
  }
}
