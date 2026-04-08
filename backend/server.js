import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { healthCheck } from "./controllers/aiController.js";
import { aiRoutes } from "./routes/aiRoutes.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "8787", 10);
const frontendUrl = process.env.FRONTEND_URL?.trim();
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many AI generation requests. Please try again in a minute.",
  },
});

app.use(
  cors({
    origin: frontendUrl || true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", healthCheck);
app.use("/api/generate", generateLimiter);
app.use("/api", aiRoutes);

app.use((error, _request, response, _next) => {
  console.error("Unhandled backend error.", error);
  response.status(500).json({
    success: false,
    error: "Unexpected backend error.",
  });
});

app.listen(port, () => {
  console.log(`WriterZ backend listening on port ${port}`);
});
