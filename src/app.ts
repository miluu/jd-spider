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
    // item.getItemPromise('https://item.m.jd.com/product/11334935.html?sid=86176584eed5d5653f0321399be63ad3', '儿童绘本')
    //   .then((goodsno) => {
    //     logger.info(`********** ${goodsno} **********`);
    //   })
    //   .catch((err) => {
    //     logger.error(`********** ${err} **********`);
    //   });
    catelogy.getPageItemsPromise([0, 1]);
  }
}

export default app;
