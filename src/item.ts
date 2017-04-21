import * as request from 'request';
import * as cheerio from 'cheerio';
import * as gm from 'gm';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import logger from './logger';
import {ASSETS_PATH, ROOT_PATH} from './paths';
const mkdirp = require('mkdirp');

module item {
  export interface IItemInfo {
    goodsno?: string;
    brand?: string;
    title?: string;
    description?: string;
    price?: number;
    detailsApi?: string;
    detailUrl?: string;
    thumbnail?: IImg;
    imgs?: IImg[];
  }

  export interface IImg {
    url: string;
    width?: number;
    height?: number;
  }

  export function getItem (url: string, brand: string) {
    logger.info(`开始获取商品信息: ${url}`);

    let itemInfo: IItemInfo = {};
    analysePagePromise(url)
      .then(info => {
        logger.info('页面解析完成。');
        info.brand = brand;
        itemInfo.brand = info.brand;
        itemInfo.title = info.title;
        itemInfo.description = info.description;
        itemInfo.price = info.price;
        itemInfo.goodsno = info.goodsno;
        if (checkItemExist(info.goodsno)) {
          return Promise.reject('Exist');
        }
        return downloadAllImgPromise(info);
      })
      .then((downloadInfo) => {
        itemInfo.imgs = _.chain(downloadInfo.downloadImgs)
          .filter(function (img: any) {
            return img.filename;
          })
          .map((img: any) => {
            return {url: formatPath(path.relative(ROOT_PATH, img.filename))};
          })
          .value();
        logger.info(`图片下载完成: 成功${downloadInfo.successCount}, 失败${downloadInfo.failedCount}.`);
        return createThumbPromise(itemInfo.imgs[0].url);
      })
      .then((obj) => {
        const {thumb} = obj;
        itemInfo.thumbnail = {
          url: formatPath(path.relative(ROOT_PATH, thumb))
        };
        logger.info(`生成缩略图:`, path.basename(thumb));
        const infoFilename = saveItemInfo(itemInfo);
        logger.info(`商品信息 ${infoFilename} 保存成功.`);
      })
      .catch(err => {
        if (_.includes(err, 'Exist')) {
          logger.warn('商品信息已存在.');
          return;
        }
        logger.error(err);
      });
  }

  function checkItemExist (goodsno: string): boolean {
    const infoFilename = path.join(ASSETS_PATH, 'goods', goodsno, 'item.json');
    return fs.existsSync(infoFilename);
  }

  function saveItemInfo (info: IItemInfo) {
    const filename = 'item.json';
    const filedir = path.join(ASSETS_PATH, 'goods', info.goodsno);
    const infoStr = JSON.stringify(info, null, 4);
    mkdirp.sync(filedir);
    fs.writeFileSync(path.join(filedir, filename), infoStr);
    return filename;
  }

  function analysePagePromise (url: string): Promise<IItemInfo> {
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (error) {
          reject(error);
        }
        const code = response && response.statusCode;
        let err: string;
        if (code !== 200) {
          err = 'Response status code: ' + code;
          reject(err);
        }
        const info = analyseHtml(body);
        resolve(info);
      });
    });
  }

  function analyseHtml (html: string): IItemInfo {
    const $ = cheerio.load(html);
    const title = $('.title-text').text() || '暂无标题';
    const $description = $('.prod-act');
    $description.find('a').remove();
    const description = $('.prod-act').text() || '暂无描述';
    const $img = $('.scroll-imgs').find('img.J_ping');
    const goodsno = $('.header-tab-item').attr('report-pageparam') || '';
    const detailsApi = `https://item.m.jd.com/ware/detail.json?wareId=${_.trim(goodsno)}`;
    const price = $('.yang-pic-price, .plus-jd-price-text, .plus-member-price-text').text() || '39';
    const imgs = _.map($img, el => {
      const $el = $(el);
      let url = _.trim($el.attr('imgsrc') || $el.attr('src'));
      if (!_.startsWith(url, 'http')) {
        url = 'http:' + url;
      }
      return {url};
    });
    return {
      brand: null,
      goodsno: _.trim(goodsno),
      title: _.trim(title),
      price: parseFloat(_.trim(price)),
      description: _.trim(description),
      detailsApi,
      imgs
    };
  }

  function downloadAllImgPromise (info: IItemInfo): Promise<any> {
    let {imgs, goodsno} = info;
    let count = imgs ? imgs.length : 0;
    let successCount = 0;
    let failedCount = 0;
    let downloadImgs: {url: string; filename: string}[] = [];
    return new Promise((resolve, reject) => {
      _.forEach(imgs, (img, index) => {
        const url = img.url;
        const filename = newKey(`${goodsno}_`) + '.jpg';
        const fullFilename = path.join(ASSETS_PATH, 'goods', goodsno, 'imgs', filename);
        downloadImgPromise(url, fullFilename)
          .then(obj => {
            successCount++;
            logger.debug(`图片下载成功: ${url} ---> ${filename}`);
            finishHandle(url, fullFilename, index);
          })
          .catch(err => {
            failedCount++;
            logger.warn(`图片下载失败: ${url}`);
            finishHandle(url, undefined, index);
          });
      });

      function finishHandle (url: string, filename: string, index: number) {
        downloadImgs[index] = {url, filename};
        if (successCount + failedCount < count) {
          return;
        }
        if (successCount === 0) {
          reject('All imgs download failed.');
        } else {
          resolve({successCount, failedCount, downloadImgs});
        }
      }
    });
  }

  function downloadImgPromise (url: string, filename: string): Promise<any> {
    const dirname = path.dirname(filename);
    mkdirp.sync(dirname);
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (error) {
          reject(error);
        }
        const code = response && response.statusCode;
        let err: string;
        if (code !== 200) {
          err = 'Response status code: ' + code;
          reject(err);
        } else {
          resolve({url, filename});
        }
      })
        .pipe(fs.createWriteStream(filename));
    });
  }

  function createThumbPromise (sourceFilename: string, thumbFilename?: string, width: number = null, height: number = null): Promise<any> {
    const sourceFile = path.parse(sourceFilename);
    if (!thumbFilename) {
      thumbFilename = path.join(sourceFile.dir, `${sourceFile.name}_thumb${sourceFile.ext || ''}`);
    }
    const outputDir = path.dirname(thumbFilename);
    mkdirp.sync(outputDir);
    if (!width && !height) {
      height = 200;
    }
    return new Promise((resolve, reject) => {
      gm(sourceFilename)
        .resize(width, height)
        .write(thumbFilename, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({source: sourceFilename, thumb: thumbFilename});
        });
    });
  }

  function formatPath(filePath: string) {
    const pathArr = filePath.split(path.sep);
    return pathArr.join('/');
  }

  let uniqKey = 0;
  function newKey (prefix?: string): string {
    let key = prefix || '';
    uniqKey++;
    return prefix + uniqKey;
  }
}

export default item;
