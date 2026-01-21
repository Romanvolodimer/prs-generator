import { Router } from "express";
import {
  createInstallation,
  getInstallation,
  saveInstallation,
  listInstallations,
} from "../services/installation.service.js";

const router = Router();

router.get("/", listInstallations); // 👈 ВАЖЛИВО: ПЕРШИМ
router.post("/", createInstallation);
router.get("/:id", getInstallation);
router.post("/:id", saveInstallation);

export default router;
import { generateXML } from "../services/xml.service.js";
import fs from "fs";
import path from "path";

router.get("/:id/xml", (req, res) => {
  const file = path.resolve("data/installations", `${req.params.id}.txt`);
  if (!fs.existsSync(file)) {
    return res.status(404).send("Installation not found");
  }

  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const xml = generateXML(data);

  res.setHeader("Content-Type", "application/xml");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${req.params.id}.xml"`,
  );

  res.send(xml);
});
