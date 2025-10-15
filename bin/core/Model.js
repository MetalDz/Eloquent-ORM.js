"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
class Model {
    constructor() {
        this.table = "";
    }
    static find(id) {
        console.log(`Finding record with id ${id}`);
    }
    static all() {
        console.log(`Getting all records`);
    }
}
exports.Model = Model;
