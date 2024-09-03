import { createServer } from "http";
import { Server } from "socket.io";
import { Room } from "./room.js";
import { Player } from "./player.js";
import { assert } from "console";
const httpServer = createServer();
const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const rooms = Room.rooms;
let nextroom = 0;
let capacity = 0;
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    // Broadcast message to all clients except the sender
    let player = new Player(socket);
    socket.on('play', message => {
        if (player.playing) {
            console.log('player already playing');
            return;
        }
        player.playing = true;
        if ('name' in message) {
            player.name = message.name;
        }
        if (Player.waitingPlayer == null) {
            Player.waitingPlayer = player;
            socket.emit('message', { state: 'wait' });
            console.log('player is now waiting');
        }
        else {
            let room = new Room(Player.waitingPlayer, player);
            Player.waitingPlayer.room = room;
            player.room = room;
            rooms.set(room.id, room);
            console.log(`A game has started. Players: ${Player.waitingPlayer.name}, ${player.name}`);
            Player.waitingPlayer = null;
            room.startGame();
        }
    });
    socket.on('message', (data) => {
        console.log('message received: ' + data);
        assert(player.room != null);
        player.room?.onPlayerMessage(player, data);
    });
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('a player disconnected');
        if (Player.waitingPlayer && player === Player.waitingPlayer) {
            Player.waitingPlayer = null;
        }
        assert(player.room != null);
        player.room?.onPlayerDisconnect(player);
    });
});
httpServer.listen(3001, () => {
    console.log('WebSocket server listening on port 3001');
});
//# sourceMappingURL=server.js.map