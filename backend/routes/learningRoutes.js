import { Router } from "express";
import {
  getLearningProgressSummary,
  getTodayLearning,
  submitLearning,
  submitWriting,
} from "../controllers/learningController.js";

const learningRoutes = Router();

learningRoutes.get("/today", getTodayLearning);
learningRoutes.get("/progress", getLearningProgressSummary);
learningRoutes.post("/submit", submitLearning);
learningRoutes.post("/submit-writing", submitWriting);

export { learningRoutes };
