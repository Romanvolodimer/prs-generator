import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import installationRoutes from "./src/routes/installation.routes.js";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;

// === __dirname для ES modules ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === middleware ===
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === routes ===
app.use("/api/installations", installationRoutes);

// === healthcheck (корисно для Render) ===
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// === start server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

console.log("DB URL exists:", !!process.env.DATABASE_URL);
