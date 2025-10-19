// backend/src/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:3000", // adres frontendu podczas devu
    credentials: true,
  })
);

app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

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

  // przyklad: wysylamy powitanie do klienta
  socket.emit("welcome", { msg: "Witaj z backendu Socket.IO!" });

  // odbieranie eventu od klienta
  socket.on("client:hello", (data) => {
    console.log("client:hello =>", data);
    // broadcast do wszystkich oprocz zrodla
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
