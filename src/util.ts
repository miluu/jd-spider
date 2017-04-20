import * as fs from 'fs';
import logger from './logger';

module util {
  export function readJson (fileName: string): any {
    const str = fs.readFileSync(fileName, 'utf-8');
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error(e);
      logger.error(e.toString());
    }
  }
}

export default util;
