const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io optimizada para estabilidad en Render[cite: 1]
const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Servir archivos estáticos desde la raíz del proyecto[cite: 1]
app.use(express.static(__dirname));

let drawingHistory = [];
let users = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('setName', (name) => {
        users[socket.id] = name;
        socket.emit('initHistory', drawingHistory);
        io.emit('users', Object.values(users));
    });

    socket.on('draw', (data) => {
        drawingHistory.push(data);
        socket.broadcast.emit('draw', data);
        if (users[socket.id]) {
            socket.broadcast.emit('userDrawing', users[socket.id]);
        }
    });

    socket.on('fill', (data) => {
        drawingHistory.push(data);
        socket.broadcast.emit('fill', data);
        if (users[socket.id]) {
            socket.broadcast.emit('userDrawing', users[socket.id]);
        }
    });

    socket.on('cursorMove', (data) => {
        socket.broadcast.emit('cursorMove', { ...data, id: socket.id });
    });

    socket.on('clear', () => {
        drawingHistory = [];
        io.emit('clear');
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        delete users[socket.id];
        io.emit('users', Object.values(users));
        io.emit('removeCursor', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
