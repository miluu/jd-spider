import * as gm from 'gm';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import item from './item';
import util from './util';
import {
  FILES_PATH
} from './paths';

import catelogy from './catelogy';

module app {
  export function run () {
    logger.info('App start.');
    new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 60 * 60 * 1000);
    })
      .then()
      .catch();
    catelogy.getCatelogyItems([0, 3]);
  }
}

export default app;
