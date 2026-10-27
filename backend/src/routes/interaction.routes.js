import { Router } from "express";
import multer from "multer";
import { createInteraction, listSavedInteractions, playInteractionAudio } from "../controllers/interaction.controller.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 2 },
});

router.post("/", upload.fields([
  { name: "inputAudio", maxCount: 1 },
  { name: "responseAudio", maxCount: 1 },
]), createInteraction);
router.get("/", listSavedInteractions);
router.get("/:id/audio/:kind", playInteractionAudio);

export default router;
