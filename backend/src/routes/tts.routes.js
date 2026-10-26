import { Router, json } from "express";
import { synthesize } from "../controllers/tts.controller.js";

const router = Router();
router.post("/synthesize", json({ limit: "16kb" }), synthesize);

export default router;
