const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const sendEmail = require("../../utils/sendEmail");

const router = express.Router();

// REJESTRACJA
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "Wszystkie pola są wymagane" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "Hasło musi mieć minimum 6 znaków" });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res
        .status(400)
        .json({ message: "Użytkownik o tym emailu już istnieje" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });

    // Utwórz UserStats dla nowego użytkownika
    await prisma.userStats.create({
      data: {
        userId: user.id,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    res
      .status(201)
      .json({ message: "Rejestracja zakończona sukcesem", userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// LOGOWANIE
router.post("/login", async (req, res) => {
  try {
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
      {
        expiresIn: "1h",
      }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// REQUEST RESET PASSWORD
router.post("/request-password-reset", async (req, res) => {
  try {
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
      `<p>Kliknij, aby zresetować hasło: <a href="${resetUrl}">${resetUrl}</a></p>`
    );

    res.json({ message: "Wysłano link resetu hasła na email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res
        .status(400)
        .json({ message: "Token i nowe hasło są wymagane" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res
        .status(400)
        .json({ message: "Nieprawidłowy lub wygasły token" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (
      !user ||
      user.resetToken !== token ||
      user.resetTokenExpiry < new Date()
    )
      return res
        .status(400)
        .json({ message: "Token jest nieważny lub wygasł" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "Hasło zostało pomyślnie zmienione" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// GET CURRENT USER PROFILE - Z BAZY
// ============================================
router.get("/users/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });

    if (!user) {
      return res.status(404).json({ message: "Użytkownik nie znaleziony" });
    }

    res.json({
      id: user.id,
      email: user.email, // ← PRAWDZIWY EMAIL Z BAZY
      username: user.username,
      displayName: user.username,
      avatar: "👤",
      bio: "",
      level: "A1",
      joinedDate: user.createdAt.toISOString(),
      lastActive: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// GET USER STATS - Z BAZY
// ============================================
router.get("/users/:userId/stats", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = parseInt(req.params.userId);
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Pobierz statystyki z bazy
    const stats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!stats) {
      return res.status(404).json({ message: "Brak statystyk dla użytkownika" });
    }

    res.json({
      totalPoints: stats.totalPoints,
      globalRank: stats.globalRank,
      totalUsers: 1,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      todayLessons: 0, // Można dodać logikę jeśli chcesz
      dailyGoal: 5,
      weeklyHours: stats.totalHoursLearned,
      totalHours: stats.totalHoursLearned,
      completedCourses: 0, // Można dodać logikę
      activeCourses: 0, // Można dodać logikę
      lessonsCompleted: stats.lessonsCompleted,
      quizzesCompleted: stats.quizzesCompleted,
      averageAccuracy: stats.averageAccuracy,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// GET USER COURSES - Z BAZY
// ============================================
router.get("/users/:userId/courses", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = parseInt(req.params.userId);
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Pobierz kursy użytkownika z bazy
    const userCourses = await prisma.userCourse.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        course: true
      }
    });

    const courses = userCourses.map(uc => ({
      id: uc.course.id,
      title: uc.course.title,
      level: uc.course.level,
      progress: uc.progress,
      type: "course",
      lastStudied: uc.lastStudied,
      totalLessons: uc.course.totalLessons,
      completedLessons: uc.lessonsCompleted,
      estimatedTime: "20h",
      difficulty: uc.course.level,
      description: uc.course.description || "",
      category: uc.course.category,
      emoji: uc.course.emoji,
      color: uc.course.color,
      isActive: uc.isActive
    }));

    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// GET USER ACTIVITY - Z BAZY
// ============================================
router.get("/users/:userId/activity", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 10;
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Pobierz aktywność z bazy
    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// UPDATE USER PROFILE - Bio, Avatar, DisplayName
// ============================================
router.put("/users/me/update", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { displayName, bio, avatar } = req.body;
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Aktualizuj profil użytkownika
    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: {
        displayName: displayName || undefined,
        bio: bio || undefined,
        avatar: avatar || undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatar: true,
        createdAt: true,
      }
    });

    res.json({
      message: "Profil zaktualizowany pomyślnie",
      user: updatedUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// CHANGE PASSWORD
// ============================================
router.put("/users/me/password", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { currentPassword, newPassword } = req.body;
    
    if (!token || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Wszystkie pola są wymagane" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Nowe hasło musi mieć co najmniej 6 znaków" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Pobierz użytkownika z bazy
    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });

    if (!user) {
      return res.status(404).json({ message: "Użytkownik nie znaleziony" });
    }

    // Sprawdzenie czy stare hasło jest prawidłowe
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Bieżące hasło jest nieprawidłowe" });
    }

    // Hashuj nowe hasło
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Zaktualizuj hasło
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: "Hasło zmienione pomyślnie" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// GET USER SETTINGS
// ============================================
router.get("/users/:userId/settings", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = parseInt(req.params.userId);
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Pobierz ustawienia użytkownika
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    // Jeśli ustawienia nie istnieją, utwórz domyślne
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId }
      });
    }

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ============================================
// UPDATE USER SETTINGS
// ============================================
router.put("/users/:userId/settings", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = parseInt(req.params.userId);
    const { dailyGoal, difficulty, notificationsEnabled, emailNotifications, profilePublic, showStats } = req.body;
    
    if (!token) {
      return res.status(401).json({ message: "Brak tokena autentykacji" });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Nieprawidłowy token" });
    }

    // Najpierw sprawdź czy ustawienia istnieją
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Jeśli nie istnieją, utwórz nowe
      settings = await prisma.userSettings.create({
        data: {
          userId,
          dailyGoal: dailyGoal || 15,
          difficulty: difficulty || "Medium",
          notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
          emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
          profilePublic: profilePublic !== undefined ? profilePublic : true,
          showStats: showStats !== undefined ? showStats : true,
        }
      });
    } else {
      // Jeśli istnieją, zaktualizuj
      settings = await prisma.userSettings.update({
        where: { userId },
        data: {
          dailyGoal: dailyGoal !== undefined ? dailyGoal : settings.dailyGoal,
          difficulty: difficulty || settings.difficulty,
          notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : settings.notificationsEnabled,
          emailNotifications: emailNotifications !== undefined ? emailNotifications : settings.emailNotifications,
          profilePublic: profilePublic !== undefined ? profilePublic : settings.profilePublic,
          showStats: showStats !== undefined ? showStats : settings.showStats,
        }
      });
    }

    res.json({
      message: "Ustawienia zaktualizowane pomyślnie",
      settings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

module.exports = router;
