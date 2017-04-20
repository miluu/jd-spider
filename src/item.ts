import logger from './logger';

module item {
  export function getItem (url: string) {
    logger.info(`Start get item from page: ${url}`);
  }
}

export default item;
