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
    item.getItem('https://item.m.jd.com/product/11781267.html');
  }
}

export default app;
