import express from "express";
import multer from "multer";
import audioRoutes from "./routes/audio.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import ttsRoutes from "./routes/tts.routes.js";
import interactionRoutes from "./routes/interaction.routes.js";

const app = express();

app.get("/", (_req, res) => {
  res.json({ name: "3CX AI Voice Agent POC API" });
});

app.use("/api/audio", audioRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/interactions", interactionRoutes);

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Audio file is too large. Maximum size is 10 MB." });
    }
    return res.status(400).json({ error: "Could not upload the audio file." });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Send valid JSON with a text field." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  next(error);
});

export default app;
