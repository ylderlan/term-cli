"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const palavras_pt_br_1 = require("@andsfonseca/palavras-pt-br");
const view_1 = require("./view");
const os_1 = require("os");
const storage = require('node-persist');
class Game {
    static loadDatabase() {
        palavras_pt_br_1.Word.library = [...palavras_pt_br_1.BRISPELL, ...palavras_pt_br_1.UNVERSEDV2];
        this.words = palavras_pt_br_1.Word.getAllWords(this.WORD_SIZE, false, false, false, false);
        palavras_pt_br_1.Word.library = this.words;
        this.wordsWithoutAccents = palavras_pt_br_1.Word.getAllWords(this.WORD_SIZE, true);
        palavras_pt_br_1.Word.library = this.wordsWithoutAccents;
        this.dailyWord = palavras_pt_br_1.Word.getDailyWord();
    }
    static createKeyboard() {
        for (let i = 0; i < this.ALLOWED_LETTERS.length; i++) {
            this.keyboard[this.ALLOWED_LETTERS[i]] = this.DEFAULT_TEXT;
        }
    }
    static gameLoop() {
        let stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        stdin.on('data', (key) => {
            if (!this.isOver)
                this.onDetectAnyKeyDuringGame(key);
            else {
                process.exit();
            }
        });
    }
    static onDetectAnyKeyDuringGame(key) {
        let warning = "";
        let win = false;
        let keyAsString = key.toString();
        // ctrl-c -> Sair do Jogo
        //@ts-ignore
        if (key === '\u0003') {
            process.exit();
        }
        // backspace ou delete -> Apagar Palavra
        //@ts-ignore
        else if (key === '\b' || key == '\x1B[3~') {
            this.currentLetters.pop();
        }
        //Se Enter -> Próximo estado
        //@ts-ignore
        else if (key === '\r') {
            let word = this.currentLetters.join('').toLowerCase();
            if (this.currentLetters.length != 5) {
                warning = "Letra(s) faltando!";
            }
            else if (!palavras_pt_br_1.Word.checkValid(word)) {
                warning = "Esta palavra não existe!";
            }
            else {
                let validations = palavras_pt_br_1.Word.wordleValidator(this.dailyWord, word);
                this.triedWords.push(this.currentLetters);
                this.triedWordsValidated.push(validations);
                this.currentAttempt++;
                //Estado de Win
                if (validations.every(v => v.exact === true)) {
                    this.isOver = true;
                    win = true;
                }
                //Estado de Perda
                else if (this.currentAttempt == this.ATTEMPTS) {
                    this.isOver = true;
                }
                else {
                    this.currentLetters = [];
                }
                view_1.View.renderKeyboard(this.keyboard, validations, this.WORD_SIZE, false);
            }
        }
        //Se ainda pode escrever faça
        else if (this.currentLetters.length < this.WORD_SIZE && this.ALLOWED_LETTERS.indexOf(keyAsString.toUpperCase()) > -1) {
            this.currentLetters.push(keyAsString.toUpperCase());
        }
        else {
            return;
        }
        this.loadBoard(warning, true, !this.isOver);
        if (this.isOver) {
            this.final(win, this.currentAttempt).then(() => {
                console.log("Clique em qualquer tecla para sair...");
            });
        }
    }
    static loadBoard(additionalWarning = "", clearBeforeRender = false, renderCleanTry = true) {
        if (clearBeforeRender)
            view_1.View.clearLine(this.boardSize);
        this.boardSize = 4;
        view_1.View.renderWarning("Tentativas restantes: " + (this.ATTEMPTS - this.currentAttempt), 1);
        for (let i = 0; i < this.currentAttempt; i++, this.boardSize++) {
            view_1.View.renderStatus(this.triedWords[i], this.triedWordsValidated[i]);
        }
        if (renderCleanTry) {
            view_1.View.renderStatus(this.currentLetters);
            this.boardSize++;
        }
        view_1.View.renderWarning(additionalWarning);
        view_1.View.renderKeyboard(this.keyboard);
    }
    static start() {
        //Visualização Inicial
        view_1.View.clear();
        view_1.View.renderTitle(this.title);
        view_1.View.renderSection(this.tips);
        //Carrega a Base de Dados
        this.loadDatabase();
        //Cria o teclado
        this.createKeyboard();
        //Carrega o tabuleiro
        this.loadBoard();
        //Game Loop
        this.gameLoop();
    }
    static final(win, position = 6) {
        return __awaiter(this, void 0, void 0, function* () {
            yield storage.init({ dir: os_1.homedir + "/.term-cli" });
            let count = yield storage.getItem('count');
            if (count == undefined) {
                console.log("");
                yield this.resetStats();
                count = 0;
            }
            let wins = yield storage.getItem('wins');
            let stats = yield storage.getItem('stats');
            let date = yield storage.getItem('lastGame');
            if (win) {
                wins++;
            }
            count++;
            stats[position]++;
            date = new Date();
            yield storage.setItem("count", count);
            yield storage.setItem("wins", wins);
            yield storage.setItem("stats", stats);
            yield storage.setItem("lastGame", date);
            view_1.View.renderStaticts(count, wins, stats);
            view_1.View.renderBoard(this.triedWordsValidated);
            view_1.View.renderWarning("Estatísticas do jogo copiadas para a área de transferência");
        });
    }
    static resetStats(store = undefined) {
        return __awaiter(this, void 0, void 0, function* () {
            if (store == undefined) {
                storage.init({ dir: os_1.homedir + "/.term-cli" }).then((_) => {
                    this.resetStats(storage);
                });
            }
            yield storage.setItem("count", 0);
            yield storage.setItem("wins", 0);
            yield storage.setItem("stats", [0, 0, 0, 0, 0, 0, 0]);
            let d = new Date();
            d.setDate(d.getDate() - 5);
            yield storage.setItem("lastGame", d);
        });
    }
}
exports.Game = Game;
Game.WORD_SIZE = 5;
Game.ATTEMPTS = 6;
Game.ALLOWED_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
Game.DEFAULT_TEXT = (s) => { return s; };
Game.words = [];
Game.wordsWithoutAccents = [];
Game.dailyWord = "";
Game.currentAttempt = 0;
Game.triedWords = [];
Game.triedWordsValidated = [];
Game.currentLetters = [];
Game.keyboard = {};
Game.boardSize = 5;
Game.isOver = false;
Game.title = "Game";
Game.tips = "Dicas";
