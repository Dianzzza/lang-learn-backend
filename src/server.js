// backend/src/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth"); // <--- import routes auth
const categoriesRoutes = require("./routes/categories");
const flashcardsRoutes = require("./routes/flashcards");
const quizzesRoutes = require("./routes/quizzes");
//const { test } = require("./prismaClient");
const testsRoutes = require("./routes/tests");

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json()); // <--- potrzebne do parsowania JSON z frontend

// --------------------
// Endpointy auth
// --------------------
app.use("/api/auth", authRoutes);

// Kategorie i fiszki
app.use("/api/categories", categoriesRoutes);
app.use("/api/flashcards", flashcardsRoutes);

// Quizy
app.use("/api/quizzes", quizzesRoutes);

//Testy
app.use("/api/tests", testsRoutes);

// --------------------
// Test zdrowia serwera
// --------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

// --------------------
// Socket.IO
// --------------------
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

  socket.emit("welcome", { msg: "Witaj z backendu Socket.IO!" });

  socket.on("client:hello", (data) => {
    console.log("client:hello =>", data);
    socket.broadcast.emit("broadcast:message", {
      from: socket.id,
      text: data.text,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket ${socket.id} disconnected:`, reason);
  });
});

httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
