import * as fs from 'fs';
import logger from './logger';
import * as path from 'path';
import {CONFIG_PATH} from './paths';

const mkdirp = require('mkdirp');

module util {
  export function readJson (fileName: string): any {
    try {
      const str = fs.readFileSync(fileName, 'utf-8');
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  export function saveJson (obj: any, filename: string): string {
    const filedir = path.dirname(filename);
    const basename = path.basename(filename);
    let infoStr;
    try {
      infoStr = JSON.stringify(obj, null, 4);
      mkdirp.sync(filedir);
      fs.writeFileSync(filename, infoStr);
    } catch (e) {
      return;
    }
    return basename;
  }

  export function getProgress (): [number, number] {
    let progress: [number, number] = readJson(path.join(CONFIG_PATH, 'progress.json'));
    if (!progress) {
      return [0, 0];
    }
    return progress;
  }

  export function saveProgress (progress: [number, number]) {
    return saveJson(progress, path.join(CONFIG_PATH, 'progress.json'));
  }

  export function nextPageProgress (current: [number, number]): [number, number] {
    let next = current.concat() as [number, number];
    next[1]++;
    if (next[1] > 25) {
      next[1] = 1;
      next[0]++;
    }
    return next;
  }
}

export default util;
