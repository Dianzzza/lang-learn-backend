// backend/routes/tests.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const auth = require("../../middleware/auth");

const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^\w\s]|_/g, "") // usuń interpunkcję
    .replace(/\s{2,}/g, " ")
    .trim();

// GET /api/tests/templates?categoryId=1
router.get("/templates", auth, async (req, res) => {
  const categoryId = Number(req.query.categoryId);
  if (!categoryId)
    return res.status(400).json({ error: "categoryId required" });

  const templates = await prisma.testTemplate.findMany({
    where: { categoryId },
    select: { id: true, sentence: true, polishWord: true },
    orderBy: { id: "asc" },
  });

  res.json({ templates });
});

// POST /api/tests/submit
// body: { testTemplateId, userAnswer }
router.post("/submit", auth, async (req, res) => {
  const userId = req.user?.id ?? req.user?.userId; // jak wcześniej z JWT
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const testTemplateId = Number(req.body.testTemplateId);
  const userAnswer = String(req.body.userAnswer ?? "");

  if (!testTemplateId)
    return res.status(400).json({ error: "testTemplateId required" });

  const template = await prisma.testTemplate.findUnique({
    where: { id: testTemplateId },
    select: { id: true, answer: true },
  });

  if (!template) return res.status(404).json({ error: "Template not found" });

  const isCorrect = normalize(userAnswer) === normalize(template.answer);

  const saved = await prisma.test.create({
    data: {
      userId,
      testTemplateId,
      userAnswer,
      isCorrect,
    },
  });

  res.status(201).json({ isCorrect, test: { id: saved.id } });
});

module.exports = router;
