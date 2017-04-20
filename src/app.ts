import logger from './logger';
import item from './item';

module app {
  export function run () {
    logger.info('App start.');
    item.getItem('https://item.m.jd.com/ware/view.action?wareId=1217500');
  }
}

export default app;
