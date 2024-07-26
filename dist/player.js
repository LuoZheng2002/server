export class Player {
    static waitingPlayer = null;
    socket;
    name;
    room;
    score;
    playing;
    constructor(socket) {
        this.socket = socket;
        this.name = null;
        this.room = null;
        this.score = 0;
        this.playing = false;
    }
}
// on disconnect: update state, notify other player
// connect: n
// game over: after the room destructs
//# sourceMappingURL=player.js.map