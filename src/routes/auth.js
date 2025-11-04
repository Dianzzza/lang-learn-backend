const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const sendEmail = require("../../utils/sendEmail");

const router = express.Router();

// Rejestracja
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: "Wszystkie pola są wymagane" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "Hasło musi mieć minimum 6 znaków" });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    return res.status(400).json({ message: "Użytkownik już istnieje" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword },
  });

  res
    .status(201)
    .json({ message: "Rejestracja zakończona sukcesem", userId: user.id });
});

// Logowanie
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Wszystkie pola są wymagane" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(400).json({ message: "Nieprawidłowy email lub hasło" });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Nieprawidłowy email lub hasło" });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
});

// Request reset hasła
router.post("/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email jest wymagany" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(400).json({ message: "Użytkownik nie istnieje" });

  const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await prisma.user.update({
    where: { email },
    data: {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  await sendEmail(
    email,
    "Reset hasła",
    `<p>Kliknij w link, aby zresetować hasło: <a href="${resetUrl}">Resetuj hasło</a></p>`
  );

  res.json({ message: "Link do resetu hasła został wysłany na Twój email" });
});

// Reset hasła
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token i nowe hasło są wymagane" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: "Nieprawidłowy lub wygasły token" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (
    !user ||
    user.resetToken !== token ||
    user.resetTokenExpiry < new Date()
  ) {
    return res.status(400).json({ message: "Token jest nieważny lub wygasł" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  res.json({ message: "Hasło zostało zmienione pomyślnie" });
});

module.exports = router;
