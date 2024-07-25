import { createServer } from "http";
import { Server } from "socket.io";
import { setTimeout } from "timers";
import { Room } from "./room";
import { Player } from "./player";
import { assert } from "console";


const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

const rooms = Room.rooms;


let nextroom = 0;
let capacity = 0;

let waitingPlayer: Player | null = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    // Broadcast message to all clients except the sender
    let player = new Player(socket);
    socket.on('play', message =>{
        if (player.playing){
            console.log('player already playing');
            return;
        }
        player.playing = true;
        if ('name' in message){
            player.name = message.name;
        }
        if (waitingPlayer == null){
            waitingPlayer = player;
            socket.emit('message', {state: 'wait'});
        }
        else{
            let room = new Room(waitingPlayer, player);
            waitingPlayer.room = room;
            player.room = room;
            waitingPlayer = null;
            rooms.set(room.id, room);
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
        assert(player.room != null);
        player.room?.onPlayerDisconnect(player);
    });
});

httpServer.listen(3001, () => {
    console.log('WebSocket server listening on port 3001');
});