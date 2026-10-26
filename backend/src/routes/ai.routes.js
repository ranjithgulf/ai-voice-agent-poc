import { Router, json } from "express";
import { chat } from "../controllers/ai.controller.js";

const router = Router();

router.post("/chat", json({ limit: "16kb" }), chat);

export default router;
