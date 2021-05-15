"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const CONFIG_FILE = 'jest-electron.json';
const DEFAULT_CONFIG = {
    height: 800,
    width: 1024,
};
/**
 * configure saver class
 */
class Config {
    constructor(dir) {
        this.dir = dir;
    }
    /**
     * get the configure save file path
     */
    getConfigPath() {
        return path.resolve(this.dir, CONFIG_FILE);
    }
    readFromFile() {
        try {
            return JSON.parse(fs.readFileSync(this.getConfigPath(), 'utf8'));
        }
        catch (e) {
            return DEFAULT_CONFIG;
        }
    }
    /**
     * get the configure of file
     */
    read() {
        if (!this.config) {
            this.config = this.readFromFile();
        }
        return this.config;
    }
    /**
     * write configure into file
     * @param config
     * @param flush
     */
    write(config, flush = false) {
        this.config = flush ? config : { ...this.read(), ...config };
        try {
            fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config));
        }
        catch (e) { }
    }
}
exports.Config = Config;
