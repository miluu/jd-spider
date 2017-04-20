import * as gm from 'gm';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import item from './item';
import {
  FILES_PATH
} from './paths';

module app {
  export function run () {
    logger.info('App start.');
    // item.getItem('https://item.m.jd.com/product/11781267.html');
    gm(path.join(FILES_PATH, 'img/xxx/test.jpg'))
      .resize(null, 320)
      .write(path.join(FILES_PATH, 'img/xxx/test_thumb.jpg'), (err) => {
        if (err) {
          logger.error(err.toString());
          return;
        }
        logger.info('Create thumb success.');
      });
  }
}

export default app;
