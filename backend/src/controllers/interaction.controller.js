import { getInteractionAudio, listInteractions, saveInteraction } from "../services/interaction.service.js";

const AUDIO_TYPES = new Map([
  [".wav", ["audio/wav", "audio/x-wav", "audio/wave"]],
  [".mp3", ["audio/mpeg", "audio/mp3"]],
  [".m4a", ["audio/mp4", "audio/x-m4a", "audio/m4a"]],
  [".ogg", ["audio/ogg"]],
  [".flac", ["audio/flac", "audio/x-flac"]],
  [".webm", ["audio/webm"]],
]);

export async function createInteraction(req, res) {
  const input = req.files?.inputAudio?.[0];
  const output = req.files?.responseAudio?.[0];
  if (!input || !output || !input.size || !output.size) {
    return res.status(400).json({ error: "Both the uploaded audio and generated response audio are required." });
  }

  const extension = input.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!AUDIO_TYPES.get(extension)?.includes(input.mimetype.toLowerCase())) {
    return res.status(415).json({ error: "Unsupported input audio format." });
  }
  if (output.buffer.length < 44
      || !["audio/wav", "audio/x-wav", "audio/wave"].includes(output.mimetype.toLowerCase())
      || output.buffer.toString("ascii", 0, 4) !== "RIFF"
      || output.buffer.toString("ascii", 8, 12) !== "WAVE") {
    return res.status(415).json({ error: "Generated audio must be a WAV file." });
  }

  const transcription = typeof req.body?.transcription === "string" ? req.body.transcription.trim() : "";
  const aiResponseText = typeof req.body?.aiResponseText === "string" ? req.body.aiResponseText.trim() : "";
  if (!transcription || !aiResponseText || transcription.length > 4000 || aiResponseText.length > 4000) {
    return res.status(400).json({ error: "Valid transcription and AI response text are required (up to 4,000 characters each)." });
  }

  try {
    const saved = await saveInteraction({
      inputFileName: input.originalname,
      inputMimeType: input.mimetype,
      inputAudio: input.buffer,
      transcription,
      aiResponseText,
      responseAudio: output.buffer,
      responseMimeType: "audio/wav",
    });
    console.info(`Voice interaction saved: ${saved.id}`);
    return res.status(201).json(saved);
  } catch (error) {
    if (error.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ error: "PostgreSQL is not configured. Set DATABASE_URL in the backend environment." });
    }
    console.error("Voice interaction save failed:", error.code || error.name);
    return res.status(503).json({ error: "Could not save the interaction to PostgreSQL. Check that the local database and table are ready." });
  }
}

function databaseFailure(res, error) {
  if (error.code === "DATABASE_NOT_CONFIGURED") {
    return res.status(503).json({ error: "PostgreSQL is not configured. Set DATABASE_URL in the backend environment." });
  }
  console.error("Voice interaction read failed:", error.code || error.name);
  return res.status(503).json({ error: "Could not read saved interactions from PostgreSQL." });
}

export async function listSavedInteractions(_req, res) {
  try {
    return res.json({ interactions: await listInteractions() });
  } catch (error) {
    return databaseFailure(res, error);
  }
}

export async function playInteractionAudio(req, res) {
  const { id, kind } = req.params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !["input", "response"].includes(kind)) {
    return res.status(400).json({ error: "Invalid interaction audio request." });
  }

  try {
    const interaction = await getInteractionAudio(id, kind);
    if (!interaction) return res.status(404).json({ error: "Saved interaction not found." });

    const bytes = kind === "input" ? interaction.inputAudio : interaction.responseAudio;
    const mimeType = kind === "input" ? interaction.inputMimeType : interaction.responseMimeType;
    res.set("Cache-Control", "private, no-store");
    res.type(mimeType);
    return res.send(Buffer.from(bytes));
  } catch (error) {
    return databaseFailure(res, error);
  }
}
