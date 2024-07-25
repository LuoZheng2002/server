"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const room_1 = require("./room");
const player_1 = require("./player");
const console_1 = require("console");
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*"
    }
});
const rooms = room_1.Room.rooms;
let nextroom = 0;
let capacity = 0;
let waitingPlayer = null;
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    // Broadcast message to all clients except the sender
    let player = new player_1.Player(socket);
    socket.on('play', message => {
        if (player.playing) {
            console.log('player already playing');
            return;
        }
        player.playing = true;
        if ('name' in message) {
            player.name = message.name;
        }
        if (waitingPlayer == null) {
            waitingPlayer = player;
            socket.emit('message', { state: 'wait' });
        }
        else {
            let room = new room_1.Room(waitingPlayer, player);
            waitingPlayer.room = room;
            player.room = room;
            waitingPlayer = null;
            rooms.set(room.id, room);
            room.startGame();
        }
    });
    socket.on('message', (data) => {
        var _a;
        console.log('message received: ' + data);
        (0, console_1.assert)(player.room != null);
        (_a = player.room) === null || _a === void 0 ? void 0 : _a.onPlayerMessage(player, data);
    });
    // Handle disconnection
    socket.on('disconnect', () => {
        var _a;
        console.log('a player disconnected');
        (0, console_1.assert)(player.room != null);
        (_a = player.room) === null || _a === void 0 ? void 0 : _a.onPlayerDisconnect(player);
    });
});
httpServer.listen(3001, () => {
    console.log('WebSocket server listening on port 3001');
});
