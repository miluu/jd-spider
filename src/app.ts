import logger from './logger';
import item from './item';

module app {
  export function run () {
    logger.info('App start.');
    item.getItem('https://item.m.jd.com/product/11781267.html');
  }
}

export default app;
