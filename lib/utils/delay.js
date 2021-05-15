"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * delay ms use promise
 * @param ms
 */
exports.delay = (ms = 200) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};
