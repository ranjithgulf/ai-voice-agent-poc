import { transcribe } from "../services/audio.service.js";

const AUDIO_TYPES = new Map([
  [".wav", { types: ["audio/wav", "audio/x-wav", "audio/wave"], mimeType: "audio/wav" }],
  [".mp3", { types: ["audio/mpeg", "audio/mp3"], mimeType: "audio/mp3" }],
  [".m4a", { types: ["audio/mp4", "audio/x-m4a", "audio/m4a"], mimeType: "audio/m4a" }],
  [".ogg", { types: ["audio/ogg"], mimeType: "audio/ogg" }],
  [".flac", { types: ["audio/flac", "audio/x-flac"], mimeType: "audio/flac" }],
  [".webm", { types: ["audio/webm"], mimeType: "audio/webm" }],
]);

const SERVICE_ERRORS = {
  NOT_CONFIGURED: [503, "Speaches STT is not configured. Check its local URL and model in the backend environment."],
  UNAVAILABLE: [503, "Speaches is unavailable. Start the local server and try again."],
  MODEL_UNAVAILABLE: [503, "The configured Speaches STT model is not installed. Check SPEACHES_STT_MODEL."],
  REQUEST_FAILED: [502, "Speaches could not transcribe the audio. Please try again."],
  REQUEST_TIMEOUT: [504, "Speaches took too long to transcribe the audio. Please try again."],
  UNPROCESSABLE_AUDIO: [422, "Speaches could not process this audio file. Try another recording."],
  EMPTY_TRANSCRIPTION: [422, "No speech was detected in the audio file. Try another recording."],
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
    const started = Date.now();
    console.info("Speaches STT started");
    const transcription = await transcribe(req.file.buffer, format.mimeType, req.file.originalname);
    console.info(`Speaches STT completed in ${Date.now() - started} ms`);
    return res.json({ transcription });
  } catch (error) {
    const knownError = SERVICE_ERRORS[error.code];
    if (knownError) {
      return res.status(knownError[0]).json({ error: knownError[1] });
    }

    console.error("Speaches STT failed:", error);
    return res.status(500).json({ error: "Something went wrong while transcribing the audio." });
  }
}
