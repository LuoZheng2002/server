import { randomInt } from "crypto";
import { Player } from "./player";
import { assert } from "console";


export class Room {
    static nextID = 0;
    static numQuestions = 5;
    static rooms = new Map();
    id: number;
    player1: Player;
    player2: Player;
    // different message handler for different states
    state: string;
    currentQuestionIdx: number;
    currentProblem: string;
    currentAnswer: string;
    timerActive: boolean;
    constructor(player1: Player, player2: Player) {
        this.id = Room.nextID++;
        this.player1 = player1;
        this.player2 = player2;
        this.state = "none";
        this.currentQuestionIdx = 1;
        this.currentProblem = "";
        this.currentAnswer = "";
        this.timerActive = false;
    }

    private getPlayers(player: Player) {
        if (player == this.player1) {
            return [this.player1, this.player2];
        }
        if (player == this.player2) {
            return [this.player2, this.player1];
        }
        console.log('unknown player: ' + JSON.stringify(player));
        console.assert(false);
        return [this.player1, this.player2];
    }
    private createProblem() {
        let number1 = randomInt(1, 100);
        let number2 = randomInt(1, 100);
        let operatorInt = randomInt(0, 2);
        if (operatorInt == 0) {
            this.currentProblem = `${number1} + ${number2} =`;
            this.currentAnswer = (number1 + number2).toString();
        }
        else if (operatorInt == 1) {
            this.currentProblem = `${number1} - ${number2} =`;
            this.currentAnswer = (number1 - number2).toString();
        }
        else {
            assert(false);
        }
    }
    startGame() {
        this.goToStart();
    }
    private sendToBoth(message: object) {
        this.player1.socket.emit('message', message);
        this.player2.socket.emit('message', message);
    }
    private cleanup() {
        // set players' room to null
        this.player1.playing = false;
        this.player2.playing = false;
        this.player1.room = null;
        this.player2.room = null;
        // close room
        Room.rooms.delete(this.id);
    }
    private goToGameOver(){
         // compare scores
         let winPlayerDesc = "";
         let losePlayerDesc = "";
         if (this.player1.score != this.player2.score){
            let [winPlayer, losePlayer] = this.player1.score > this.player2.score? [this.player1, this.player2]: [this.player2, this.player1];
            winPlayerDesc = `You won ${losePlayer.name || 'player'} by ${winPlayer.score} : ${losePlayer.score}`;
            losePlayerDesc = `You lost to ${winPlayer.name || 'player'} by ${losePlayer.score}: ${winPlayer.score}`;
            winPlayer.socket.emit('message', {state: 'gameover', description: winPlayerDesc});
            losePlayer.socket.emit('message', {state: 'gameover', description: losePlayerDesc});
         }
         else{
            let player1Desc = `You tied with ${this.player2.name || 'player'} by ${this.player1.score} : ${this.player2.score}`;
            let player2Desc = `You tied with ${this.player1.name || 'player'} by ${this.player2.score} : ${this.player1.score}`;
            this.player1.socket.emit('message', {state: 'gameover', description: player1Desc});
            this.player2.socket.emit('message', {state: 'gameover', description: player2Desc});
         }
         this.cleanup();
    }
    private goToNext() {
        if (this.currentQuestionIdx == Room.numQuestions) {
            this.goToGameOver();
        }
        else {
            this.goToTransition();
        }
    }
    private startCountdown(){
        this.timerActive = true;
        this.countdown(10, this.goToNext);
    }
    private goToStart(){
        this.sendToBoth({state: 'countdown'});
        this.startCountdown();
    }
    private problemCountdown(){
        this.timerActive = true;
        this.countdown(10, this.goToNext);
    }
    private goToProblem(){
        this.createProblem();
        this.state = 'answering';
        this.sendToBoth({state: 'ingame', problem: this.currentProblem, questionnum: this.currentQuestionIdx});
        this.problemCountdown();
    }
    private displayCountdown(time: number){
        this.sendToBoth({countdown: time});
    }
    // before start, answering, transition
    private countdown(time: number, func: ()=>void){
        if (!this.timerActive)
        {
            return;
        }
        if (time <=0){
            this.displayCountdown(time);
            func();
            return;
        }
        this.displayCountdown(time);
        setTimeout(()=>{this.countdown(time - 1, func)}, 1000);
    }

    private transitionCountdown(){
        this.timerActive = true;
        this.countdown(3, this.goToProblem);
    }
    private goToTransition() {
        this.currentQuestionIdx++;
        this.sendToBoth({ state: 'transition', questionnum: this.currentQuestionIdx });
        this.transitionCountdown();
    }
    // except for quit, player only gives messages when they are answering the questions
    onPlayerMessage(player: Player, message: object) {
        if (this.state != 'answering') {
            console.log('unexpected answering from player');
            return;
        }
        let [currPlayer, otherPlayer] = this.getPlayers(player);
        // this.state == 'answering'
        if ('answer' in message) {
            this.state = 'display';
            // stop the timer 
            this.timerActive = false;
            console.log('Someone answered a question');
            let answer = message.answer as string;
            let correct = (answer == this.currentAnswer);
            if (correct) { // state: + ;
                currPlayer.socket.emit('message', { answerer: true, answer: answer, correct: true });
                otherPlayer.socket.emit('message', { answerer: false, answer: answer, correct: true });
            }
            else {
                currPlayer.socket.emit('message', { answerer: true, answer: answer, correct: false });
                otherPlayer.socket.emit('message', { answerer: false, answer: answer, correct: false });
            }
            
            // display the addition after 1 second
            let addition = correct ? "+1" : "-5";
            let newScore = correct ? currPlayer.score + 1 : currPlayer.score - 5;
            setTimeout(() => {
                currPlayer.socket.emit('message', { modifyself: true, addition: addition });
                otherPlayer.socket.emit('message', { modifyself: false, addition: addition });
                setTimeout(() => {
                    currPlayer.socket.emit('message', { modifyself: true, newScore: newScore });
                    otherPlayer.socket.emit('message', { modifyself: false, newScore: newScore });
                    currPlayer.score = newScore;
                    setTimeout(() => {
                        this.goToNext();

                    }, 2000);
                }, 2000);
            }, 1000);
        }
        else {
            console.log('unknown message: ' + JSON.stringify(message));
        }
    }

    onPlayerDisconnect(player: Player) {
        this.timerActive = false;
        const [currPlayer, otherPlayer] = this.getPlayers(player);
        currPlayer.socket.emit('message', { state: 'gameover', description: `${otherPlayer.name || "Unknown player"} disconnected` });
        this.cleanup();
    }
}