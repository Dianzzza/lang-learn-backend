const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../../middleware/auth"); // musi ustawiać req.user.id z JWT

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/flashcards?categoryId=1&includePrivate=true
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { categoryId, includePrivate } = req.query;

    if (!categoryId) {
      return res
        .status(400)
        .json({ error: "Parametr categoryId jest wymagany" });
    }

    const userId = req.user?.id;

    const where = {
      categoryId: Number(categoryId),
      OR: [{ isGlobal: true }],
    };

    if (includePrivate === "true" && userId) {
      where.OR.push({ ownerId: userId });
    }

    const flashcards = await prisma.flashcard.findMany({
      where,
      orderBy: { id: "asc" },
    });

    res.json(flashcards);
  } catch (err) {
    console.error("GET /api/flashcards error:", err);
    res.status(500).json({ error: "Nie udało się pobrać fiszek" });
  }
});

// POST /api/flashcards – tworzenie fiszki w bazie
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { front, back, categoryId, isGlobal } = req.body;

    if (!front || !back) {
      return res
        .status(400)
        .json({ message: "Pola 'front' i 'back' są wymagane" });
    }

    const categoryIdNum =
      typeof categoryId === "number"
        ? categoryId
        : categoryId
        ? Number(categoryId)
        : null;

    const flashcard = await prisma.flashcard.create({
      data: {
        front,
        back,
        categoryId: categoryIdNum,
        isGlobal: !!isGlobal,
        ownerId: isGlobal ? null : userId,
      },
    });

    return res.status(201).json(flashcard);
  } catch (err) {
    console.error("POST /api/flashcards error:", err);
    return res.status(500).json({ message: "Nie udało się utworzyć fiszki" });
  }
});

module.exports = router;
