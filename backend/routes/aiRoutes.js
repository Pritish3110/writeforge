import { Router } from "express";
import { generateText } from "../controllers/aiController.js";
import { authenticateRequest } from "../middleware/authenticate.js";

const aiRoutes = Router();

aiRoutes.post("/generate", authenticateRequest, generateText);

export { aiRoutes };
