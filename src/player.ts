import { Socket } from "socket.io";
import { Room } from "./room.js";

export class Player{
    static waitingPlayer: Player| null = null;
    socket: Socket;
    name: string | null;
    room: Room | null;
    score: number;
    playing: boolean;
    constructor(socket: Socket){
        this.socket = socket;
        this.name = null;
        this.room = null;
        this.score = 0;
        this.playing =false;
    }
}


// on disconnect: update state, notify other player

// connect: n

// game over: after the room destructs

