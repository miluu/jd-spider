import * as path from 'path';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import item from './item';
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

  interface IListItem {
    wareId: string;
    [key: string]: any;
  }

  const catelogyList: ICatelogy[] = getCatelogyList();
  const baseApiUrl = 'https://so.m.jd.com/ware/searchList.action?_format_=json&stock=0&sort=&self=1';

  export function getListPromise(progress: [number, number]): Promise<IListItem[]> {
    const currentCatelogyIndex = progress[0];
    const currentPage = progress[1];
    const currentApi = getApiUrl(catelogyList[currentCatelogyIndex], currentPage);
    logger.debug('url: ', currentApi);
    return new Promise<IListItem[]>((resolve, reject) => {
      request(currentApi, (error, response, body) => {
        if (error) {
          reject(error);
        }
        const code = response && response.statusCode;
        let err: string;
        if (code !== 200) {
          err = 'Response status code: ' + code;
          reject(err);
        } else {
          let obj;
          try {
            obj = JSON.parse(body);
          } catch (e) {
            reject('JSON parse error.');
            return;
          }
          let list;
          try {
            obj = JSON.parse(obj.value);
          } catch (e) {
            reject('JSON parse error.');
            return;
          }
          let goodsList = <IListItem[]>obj.wareList.wareList;
          if (!goodsList) {
            reject('No wareList.');
            return;
          }
          resolve(goodsList);
        }
      });
    });
  }

  export function getPageItemsPromise(progress: [number, number]): Promise<any> {
    const [categoryIndex, page] = progress;
    const categoryName = catelogyList[categoryIndex].name;
    logger.info(`开始加载分类 [${categoryName}] 第 ${page} 页内容.`);
    return new Promise((resolve, reject) => {
      getListPromise(progress)
        .then((list) => {
          let successCount = 0;
          let failedCount = 0;
          let count = list.length;
          _.forEach(list, listItem => {
            const goodsno = listItem.wareId;
            const itemPageUrl = item.getItemPageUrl(goodsno);
            item.getItemPromise(itemPageUrl, categoryName)
              .then(() => {
                successCount++;
                finishHandle(successCount, failedCount, count);
              })
              .catch(() => {
                failedCount++;
                finishHandle(successCount, failedCount, count);
              });
          });
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
      function finishHandle (successCount: number, failedCount: number, count: number) {
        if (count > successCount + failedCount) {
          return;
        }
        logger.info(`分类 [${categoryName}] 第 ${page} 页下载完成: 成功 ${successCount}, 失败 ${failedCount}.`);
        resolve({successCount, failedCount, count});
      }
    });
  }

  function getApiUrl (category: ICatelogy, page: number = 1) {
    const pathArr = category.path.split('_');
    const [c1, c2, categoryId] = pathArr;
    return `${baseApiUrl}&categoryId=${categoryId}&c1=${c1}&c2=${c2}&page=${page}`;
  }

  function getCatelogyList () {
    const bigCatelogyList: IBigCatelogy[] = util.readJson(path.join(CONFIG_PATH, 'catelogy-list.json'));
    let _catelogyList: ICatelogy[] = [];
    _.forEach(bigCatelogyList, (bigCatelogy) => {
      _catelogyList = _catelogyList.concat(bigCatelogy.catelogyList);
    });
    return _catelogyList;
  }
}

export default catelogy;
