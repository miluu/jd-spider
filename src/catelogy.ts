import * as path from 'path';
import * as _ from 'lodash';
import util from './util';
import {CONFIG_PATH} from './paths';
import logger from './logger';

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
    logger.debug('', catelogyList);
  }

  function getCatelogyList () {
    const bigCatelogyList: IBigCatelogy[] = util.readJson(path.join(CONFIG_PATH, 'catelogy-list.json'));
    let _catelogyList: ICatelogy[] = [];
    _.forEach(bigCatelogyList, (bigCatelogy) => {
      _catelogyList.concat(bigCatelogy.catelogyList);
    });
    return _catelogyList;
  }
}

export default catelogy;
