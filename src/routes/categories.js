const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/categories – lista kategorii do wyboru
router.get("/", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ error: "Nie udało się pobrać kategorii" });
  }
});

module.exports = router;
