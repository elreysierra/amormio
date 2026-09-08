const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, "public")));

let drawingHistory = [];
let savedGallery = [];
let activeUsers = {};

io.on("connection", (socket) => {
  // Enviar historial previo al cliente al conectar
  socket.emit("initHistory", drawingHistory);
  socket.emit("updateGallery", savedGallery);

  socket.on("setName", (name) => {
    activeUsers[socket.id] = name;
    io.emit("users", Object.values(activeUsers));
  });

  // Escuchar eventos de trazo suave (resuelve las líneas geométricas)
  socket.on("drawStart", (data) => {
    drawingHistory.push({ type: "start", ...data });
    socket.broadcast.emit("drawStart", data);

    const userName = activeUsers[socket.id] || "Alguien";
    socket.broadcast.emit("userDrawing", userName);
  });

  socket.on("drawSmooth", (data) => {
    drawingHistory.push({ type: "smooth", ...data });
    socket.broadcast.emit("drawSmooth", data);

    // Añadido también aquí para que el aviso de dibujo permanezca fluido mientras arrastran el trazo
    const userName = activeUsers[socket.id] || "Alguien";
    socket.broadcast.emit("userDrawing", userName);
  });

  socket.on("fill", (data) => {
    drawingHistory.push({ type: "fill", ...data });
    socket.broadcast.emit("fill", data);

    const userName = activeUsers[socket.id] || "Alguien";
    socket.broadcast.emit("userDrawing", userName);
  });

  // Guardar en la galería y limpiar
  socket.on("saveToGallery", (dataURL) => {
    savedGallery.unshift(dataURL);
    if (savedGallery.length > 20) savedGallery.pop();
    io.emit("updateGallery", savedGallery);
  });

  socket.on("clear", () => {
    drawingHistory = [];
    io.emit("clear");
  });

  socket.on("disconnect", () => {
    delete activeUsers[socket.id];
    io.emit("users", Object.values(activeUsers));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});