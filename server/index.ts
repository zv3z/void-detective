import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import { fileURLToPath } from "url";
import path from "path";
import { initDB } from "./db.js";
import apiRouter from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const IS_PROD = process.env.NODE_ENV === "production";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3001",
  "https://zv3z.github.io",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(compression() as express.RequestHandler);
app.use(express.json({ limit: "2mb" }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// API routes
app.use("/api", apiRouter);

// Serve built frontend in production
if (IS_PROD) {
  const distDir = path.join(__dirname, "../dist/gh");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ error: IS_PROD ? "Internal Server Error" : err.message });
});

async function start() {
  try {
    if (process.env.DATABASE_URL) {
      await initDB();
    } else {
      console.warn("[DB] No DATABASE_URL set — database features disabled.");
    }
    app.listen(PORT, () => {
      console.log(`\n🔍 VoidSINT API  → http://localhost:${PORT}/api/health`);
      if (!IS_PROD) console.log(`🌐 Vite Dev     → http://localhost:5173`);
    });
  } catch (err) {
    console.error("[Fatal]", err);
    process.exit(1);
  }
}

start();
