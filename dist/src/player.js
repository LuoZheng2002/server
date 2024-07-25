"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(socket) {
        this.socket = socket;
        this.name = null;
        this.room = null;
        this.score = 0;
        this.playing = false;
    }
}
exports.Player = Player;
// on disconnect: update state, notify other player
// connect: n
// game over: after the room destructs
