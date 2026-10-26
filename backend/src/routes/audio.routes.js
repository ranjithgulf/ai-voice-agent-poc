import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../controllers/audio.controller.js";

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
});

const router = Router();

router.post("/transcribe", upload.single("audio"), transcribeAudio);

export default router;
