const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticateToken = require("../../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseIntParam(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function validateDifficulty(value) {
  const d = String(value || "").toLowerCase();
  return ALLOWED_DIFFICULTIES.has(d) ? d : null;
}

function difficultyToOptionCount(difficulty) {
  switch (difficulty) {
    case "easy":
      return 2; // 1 dobra + 1 zła
    case "medium":
      return 3; // 1 dobra + 2 złe
    case "hard":
      return 4; // 1 dobra + 3 złe
    default:
      return 3;
  }
}

// GET /api/quizzes/categories  -> kategorie + liczba pytań
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    const counts = await prisma.quiz.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
      where: { categoryId: { not: null } },
    });

    const map = new Map(counts.map((c) => [c.categoryId, c._count._all]));

    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        questionsCount: map.get(c.id) || 0,
      }))
    );
  } catch (e) {
    console.error("GET /api/quizzes/categories error:", e);
    res.status(500).json({ message: "Nie udało się pobrać kategorii quizów" });
  }
});

// GET /api/quizzes/session?categoryId=1&difficulty=easy&limit=10
router.get("/session", async (req, res) => {
  try {
    const categoryId = parseIntParam(req.query.categoryId);
    if (!categoryId) {
      return res.status(400).json({
        message: "Nieprawidłowe categoryId (musi być liczbą całkowitą).",
      });
    }

    const difficulty = validateDifficulty(req.query.difficulty);
    if (!difficulty) {
      return res.status(400).json({
        message: "Nieprawidłowa difficulty (dozwolone: easy, medium, hard).",
      });
    }

    const rawLimit = req.query.limit ?? 10;
    const limitParsed = parseIntParam(rawLimit);
    if (!limitParsed) {
      return res.status(400).json({
        message: "Nieprawidłowy limit (musi być liczbą całkowitą).",
      });
    }
    const limit = Math.max(1, Math.min(limitParsed, 50));

    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!categoryExists) {
      return res.status(404).json({ message: "Nie znaleziono kategorii." });
    }

    const optionCount = difficultyToOptionCount(difficulty);
    const wrongNeeded = optionCount - 1;

    const all = await prisma.quiz.findMany({
      where: { categoryId },
      select: {
        id: true,
        question: true,
        correctWord: true,
        polishWord: true,
      },
    });

    if (all.length === 0) {
      return res.json({ categoryId, difficulty, optionCount, questions: [] });
    }

    const picked = shuffle(all).slice(0, Math.min(limit, all.length));

    const questions = picked.map((q) => {
      const pool = all
        .filter((x) => x.id !== q.id)
        .map((x) => x.correctWord)
        .filter(Boolean);

      const uniquePool = Array.from(new Set(pool)).filter(
        (w) => w !== q.correctWord
      );

      const wrong = shuffle(uniquePool).slice(
        0,
        Math.min(wrongNeeded, uniquePool.length)
      );

      const options = shuffle([q.correctWord, ...wrong]);
      const correctIndex = options.findIndex((x) => x === q.correctWord);

      return {
        id: q.id,
        sentence: q.question,
        polishWord: q.polishWord,
        options,
        correctIndex,
      };
    });

    res.json({ categoryId, difficulty, optionCount, questions });
  } catch (e) {
    console.error("GET /api/quizzes/session error:", e);
    res.status(500).json({ message: "Nie udało się wygenerować sesji quizu" });
  }
});

// POST /api/quizzes/attempts  -> zapis minimalnego wyniku (wymaga tokena)
router.post("/attempts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Brak autoryzacji" });

    const { categoryId, difficulty, score, maxScore, durationSec } =
      req.body || {};

    const catId = Number(categoryId);
    const sc = Number(score);
    const mx = Number(maxScore);

    if (!Number.isInteger(catId)) {
      return res.status(400).json({ message: "Nieprawidłowe categoryId" });
    }

    const diff = validateDifficulty(difficulty);
    if (!diff) {
      return res.status(400).json({ message: "Nieprawidłowa difficulty" });
    }

    if (
      !Number.isInteger(sc) ||
      !Number.isInteger(mx) ||
      sc < 0 ||
      mx <= 0 ||
      sc > mx
    ) {
      return res.status(400).json({ message: "Nieprawidłowy score/maxScore" });
    }

    const dur =
      durationSec === null || durationSec === undefined
        ? null
        : Number(durationSec);

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        categoryId: catId,
        difficulty: diff,
        score: sc,
        maxScore: mx,
        durationSec: Number.isFinite(dur) && dur >= 0 ? Math.floor(dur) : null,
      },
    });

    res.status(201).json({ id: attempt.id });
  } catch (e) {
    console.error("POST /api/quizzes/attempts error:", e);
    res.status(500).json({ message: "Nie udało się zapisać wyniku quizu" });
  }
});

module.exports = router;
