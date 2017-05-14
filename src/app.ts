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
import keywords from './keywords';

module app {
  export function run () {
    logger.info('App start.');
    const preProgress = util.getProgress();
    const currentProgress = util.nextPageProgress(preProgress);
    catelogy.getCatelogyItems(currentProgress);
  }
  export function getKewordsGoods () {
    logger.info('App start. [getKewordsGoods]');
    keywords.getKeywordsGoods();
  }
}

export default app;
