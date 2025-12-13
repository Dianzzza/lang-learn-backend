const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/flashcards/user?categoryId=1 – tylko fiszki zalogowanego użytkownika
router.get("/user", authMiddleware, async (req, res) => {
  try {
    const { categoryId } = req.query;

    if (!categoryId) {
      return res
        .status(400)
        .json({ error: "Parametr categoryId jest wymagany" });
    }

    const userId = req.user.id;

    const flashcards = await prisma.flashcard.findMany({
      where: {
        categoryId: Number(categoryId),
        ownerId: userId,
        isGlobal: false,
      },
      orderBy: { id: "asc" },
    });

    res.json(flashcards);
  } catch (err) {
    console.error("GET /api/flashcards/user error:", err);
    res.status(500).json({ error: "Nie udało się pobrać fiszek użytkownika" });
  }
});

// GET /api/flashcards?categoryId=1&includePrivate=true – globalne + prywatne (do nauki)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { categoryId, includePrivate } = req.query;

    if (!categoryId) {
      return res
        .status(400)
        .json({ error: "Parametr categoryId jest wymagany" });
    }

    const userId = req.user?.id;

    const whereBase = {
      categoryId: Number(categoryId),
    };

    const orConditions = [{ isGlobal: true }];

    if (includePrivate === "true" && userId) {
      orConditions.push({ ownerId: userId });
    }

    // najpierw pobierz fiszki z kategorii (globalne + prywatne użytkownika)
    const flashcards = await prisma.flashcard.findMany({
      where: {
        ...whereBase,
        OR: orConditions,
      },
      orderBy: { id: "asc" },
      include: {
        userProgress: userId
          ? {
              where: { userId },
              select: { learned: true, toReview: true },
            }
          : false,
      },
    });

    // odfiltruj fiszki, które są nauczone przez tego usera
    const filtered = flashcards.filter((card) => {
      if (!userId) return true;
      const progress = card.userProgress?.[0];
      return !(progress && progress.learned);
    });

    res.json(
      filtered.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        categoryId: card.categoryId,
        // opcjonalnie możesz dodać status do frontu:
        status: card.userProgress?.[0]
          ? card.userProgress[0].learned
            ? "learned"
            : card.userProgress[0].toReview
            ? "repeat"
            : "none"
          : "none",
      }))
    );
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

// PUT /api/flashcards/:id – aktualizacja fiszki użytkownika
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const flashcardId = Number(req.params.id);
    const { front, back } = req.body;

    if (!front || !back) {
      return res
        .status(400)
        .json({ message: "Pola 'front' i 'back' są wymagane" });
    }

    const existing = await prisma.flashcard.findFirst({
      where: { id: flashcardId, ownerId: userId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Nie znaleziono fiszki" });
    }

    const updated = await prisma.flashcard.update({
      where: { id: flashcardId },
      data: { front, back },
    });

    res.json(updated);
  } catch (err) {
    console.error("PUT /api/flashcards/:id error:", err);
    res.status(500).json({ message: "Nie udało się zaktualizować fiszki" });
  }
});

// DELETE /api/flashcards/:id – usunięcie fiszki użytkownika
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const flashcardId = Number(req.params.id);

    const existing = await prisma.flashcard.findFirst({
      where: { id: flashcardId, ownerId: userId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Nie znaleziono fiszki" });
    }

    await prisma.flashcard.delete({
      where: { id: flashcardId },
    });

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/flashcards/:id error:", err);
    res.status(500).json({ message: "Nie udało się usunąć fiszki" });
  }
});

// PATCH /api/flashcards/:id/status – ustaw status fiszki dla użytkownika
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const flashcardId = Number(req.params.id);
    const { status } = req.body; // 'repeat' | 'learned' | 'none'

    if (!["repeat", "learned", "none"].includes(status)) {
      return res.status(400).json({ message: "Nieprawidłowy status" });
    }

    // znajdź fiszkę, musi istnieć
    const flashcard = await prisma.flashcard.findUnique({
      where: { id: flashcardId },
    });
    if (!flashcard) {
      return res.status(404).json({ message: "Nie znaleziono fiszki" });
    }

    if (status === "none") {
      // usuwamy status dla tej fiszki
      await prisma.userFlashcard.deleteMany({
        where: { userId, flashcardId },
      });
      return res.status(204).send();
    }

    const learned = status === "learned";
    const toReview = status === "repeat";

    const existing = await prisma.userFlashcard.findUnique({
      where: {
        userId_flashcardId: {
          userId,
          flashcardId,
        },
      },
    });

    let result;
    if (existing) {
      result = await prisma.userFlashcard.update({
        where: { id: existing.id },
        data: { learned, toReview },
      });
    } else {
      result = await prisma.userFlashcard.create({
        data: {
          userId,
          flashcardId,
          learned,
          toReview,
        },
      });
    }

    res.json(result);
  } catch (err) {
    console.error("PATCH /api/flashcards/:id/status error:", err);
    res
      .status(500)
      .json({ message: "Nie udało się zaktualizować statusu fiszki" });
  }
});

// POST /api/flashcards/reset – zresetuj statusy w danej kategorii dla użytkownika
// body: { categoryId: number }
router.post("/reset", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.body;

    if (!categoryId) {
      return res
        .status(400)
        .json({ message: "Parametr categoryId jest wymagany" });
    }

    await prisma.userFlashcard.deleteMany({
      where: {
        userId,
        flashcard: {
          categoryId: Number(categoryId),
        },
      },
    });

    res.status(204).send();
  } catch (err) {
    console.error("POST /api/flashcards/reset error:", err);
    res
      .status(500)
      .json({ message: "Nie udało się zresetować statusów fiszek" });
  }
});

module.exports = router;
