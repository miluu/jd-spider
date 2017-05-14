import * as path from 'path';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import item from './item';
import util from './util';
import logger from './logger';
import {CONFIG_PATH} from './paths';
import * as request from 'request';

module keywords {
  interface IKeywordsConfig {
    brands: string[];
    category: string[];
    maxPage: number;
  }
  const keywordsConfig = getKeywordsConfig();
  export function getKeywordsGoods () {
    console.log(keywordsConfig);
  }
  function getKeywordsConfig (): IKeywordsConfig {
    const filename = path.join(CONFIG_PATH, 'keywords.json');
    return util.readJson(filename);
  }
}

export default keywords;
