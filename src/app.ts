import * as gm from 'gm';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import item from './item';
import {
  FILES_PATH
} from './paths';

import catelogy from './catelogy';

module app {
  export function run () {
    logger.info('App start.');
    item.getItemPromise('https://item.m.jd.com/ware/view.action?wareId=11687858', '儿童绘本')
      .then((goodsno) => {
        logger.info(`********** ${goodsno} **********`);
      })
      .catch((err) => {
        logger.error(`********** ${err} **********`);
      });
  }
  export function runCate {
    logger.info('Cate App start.');
    catelogy.getList();
  }
}

export default app;
