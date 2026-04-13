import { Router } from "express";
import {
  getLearningProgressSummary,
  getTodaySession,
  getTodayLearning,
  submitChallenge,
  submitLearning,
  submitWriting,
  updateSession,
} from "../controllers/learningController.js";

const learningRoutes = Router();

learningRoutes.get("/today", getTodayLearning);
learningRoutes.get("/progress", getLearningProgressSummary);
learningRoutes.get("/session/today", getTodaySession);
learningRoutes.post("/session/update", updateSession);
learningRoutes.post("/submit", submitLearning);
learningRoutes.post("/submit-writing", submitWriting);
learningRoutes.post("/submit-challenge", submitChallenge);

export { learningRoutes };
