import * as path from 'path';
import * as url from 'url';
import * as _ from 'lodash';
import util from './util';
import logger from './logger';
import {CONFIG_PATH} from './paths';
import * as request from 'request';

module catelogy {
  interface ICatelogy {
    name: string;
    path: string;
    [key: string]: any;
  }
  interface IBigCatelogy {
    name: string;
    catelogyList: ICatelogy[];
    [key: string]: any;
  }
  const catelogyList: ICatelogy[] = getCatelogyList();

  export function getList() {
    // logger.debug('', catelogyList);
  }

  function getCatelogyList () {
    const bigCatelogyList: IBigCatelogy[] = util.readJson(path.join(CONFIG_PATH, 'catelogy-list.json'));
    let _catelogyList: ICatelogy[] = [];
    _.forEach(bigCatelogyList, (bigCatelogy) => {
      _catelogyList = _catelogyList.concat(bigCatelogy.catelogyList);
    });
    return _catelogyList;
  }
  const urlObj = url.parse('https://so.m.jd.com/ware/searchList.action?_format_=json&stock=0&sort=&self=1&&page=1&categoryId=12780&c1=1713&c2=100002751', true);
  urlObj.query.page = 10;
  logger.debug('', urlObj);
}

export default catelogy;
