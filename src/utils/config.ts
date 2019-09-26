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
 * 存储配置类
 */
export class Config {

  // 存储目录
  private dir: string;
  // 缓存配置
  private config: IConfig;

  constructor(dir: string) {
    this.dir = dir;
  }

  /**
   * 获得存储的文件
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
   * 读配置
   */
  read(): IConfig {
    if (!this.config) {
      this.config = this.readFromFile();
    }

    return this.config;
  }

  /**
   * 写配置
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
