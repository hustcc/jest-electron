import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = 'jest-electron.json';

const DEFAULT_CONFIG = {
  height: 800,
  width: 1024,
};

type IConfig = {
  readonly width: number;
  readonly height: number;
}

/**
 * configure saver class
 */
export class Config {

  // save dir
  private dir: string;
  // save configure
  private config: IConfig;

  constructor(dir: string) {
    this.dir = dir;
  }

  /**
   * get the configure save file path
   */
  private getConfigPath(): string {
    return path.resolve(this.dir, CONFIG_FILE);
  }

  private readFromFile(): IConfig {
    try {
      return JSON.parse(fs.readFileSync(this.getConfigPath(), 'utf8'));
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  }

  /**
   * get the configure of file
   */
  read(): IConfig {
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
  write(config: IConfig, flush: boolean = false) {
    this.config = flush ? config : { ...this.read(), ...config };
    try {
      fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config));
    } catch (e) {}
  }
}
