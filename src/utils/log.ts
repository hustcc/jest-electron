import * as fs from 'fs';

export function log(text: string) {
  fs.appendFileSync('./log.txt', `${text}\n`);
}