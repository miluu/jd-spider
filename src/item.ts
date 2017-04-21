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

  interface IDetailAttr {
    lable: string;
    value: string;
    operator?: string;
  }

  interface IDetailInfo {
    attrs: IDetailAttr[];
    bookAttrs: IDetailAttr[];
  }

  export function getItem (url: string, brand: string) {
    logger.info(`开始获取商品信息: ${url}`);

    let itemInfo: IItemInfo = {};
    let originInfo: IItemInfo;
    analysePagePromise(url)
      .then(info => {
        originInfo = info;
        logger.info('页面解析完成。');
        info.brand = brand;
        itemInfo.brand = info.brand;
        itemInfo.title = info.title;
        itemInfo.description = info.description;
        itemInfo.price = info.price;
        itemInfo.goodsno = info.goodsno;
        return getDetailInfoPromise(originInfo.detailsApi);
      })
      .then((orginDetailInfo: any) => {
        let detailInfo: IDetailInfo;
        try {
          detailInfo = {
            attrs: orginDetailInfo.ware.attrs,
            bookAttrs: orginDetailInfo.ware.bookAttrs
          };
        } catch (e) {
          return Promise.reject(e);
        }

        return createDetailPromise(detailInfo, itemInfo.goodsno);
      })
      .then((newDetailInfo) => {
        console.log(newDetailInfo);
        return downloadAllImgPromise(originInfo);
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

  function createDetailPromise (detailInfo: IDetailInfo, goodsno: string): Promise<any> {
    let newDetailInfo = (<IDetailInfo>{});
    let {attrs, bookAttrs} = detailInfo;
    let images: [string, string][] = [];
    newDetailInfo.attrs = attrs;
    newDetailInfo.bookAttrs = _.map(bookAttrs, (bookAttr) => {
      let newBookAttr = _.clone(<IDetailAttr>bookAttr);
      let $ = cheerio.load(bookAttr.value);
      $('img').each((i, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        const newSrc = `detail-images/${newKey(goodsno + '_')}.jpg`;
        $el.removeAttr('title');
        $el.attr('src', newSrc);
        images.push([src, path.join(ASSETS_PATH, 'goods', goodsno, newSrc)]);
      });
      newBookAttr.value = global.unescape($.html().replace(/&#x/g, '%u').replace(/;/g, ''));
      return newBookAttr;
    });
    const detailFile = saveJson(newDetailInfo, path.join(ASSETS_PATH, 'goods', goodsno, 'detail.json'));
    return new Promise((resolve, reject) => {
      if (detailFile) {
        logger.info('详情信息保存成功:', detailFile);
      } else {
        logger.error('详情信息保存失败.');
        reject(`${goodsno} 详情信息保存失败.`);
      }
      downloadDetailImgPromise(images, goodsno)
        .then((obj) => {
          logger.info(`详情图片下载完成: 成功${obj.successCount}, 失败${obj.failedCount}.`);
          resolve(newDetailInfo);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  function downloadDetailImgPromise (images: [string, string][], goodsno: string): Promise<any> {
    let count = images.length;
    let successCount = 0;
    let failedCount = 0;
    let downloadImgs: {url: string; filename: string}[] = [];
    return new Promise((resolve, reject) => {
      _.forEach(images, (image, index) => {
        const url = image[0];
        const fullFilename = image[1];
        const filename = path.basename(fullFilename);
        downloadImgPromise(url, fullFilename)
          .then(obj => {
            successCount++;
            logger.debug(`详情图片下载成功: ${url} ---> ${filename}`);
            finishHandle(url, fullFilename, index);
          })
          .catch(err => {
            failedCount++;
            logger.warn(`详情图片下载失败: ${url}`);
            finishHandle(url, undefined, index);
          });
      });

      function finishHandle (url: string, filename: string, index: number) {
        downloadImgs[index] = {url, filename};
        if (successCount + failedCount < count) {
          return;
        }
        resolve({successCount, failedCount, downloadImgs});
      }
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

  function saveJson (obj: any, filename: string): string {
    const filedir = path.dirname(filename);
    const basename = path.basename(filename);
    let infoStr;
    try {
      infoStr = JSON.stringify(obj, null, 4);
      mkdirp.sync(filedir);
      fs.writeFileSync(filename, infoStr);
    } catch (e) {
      return;
    }
    return basename;
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

  function getDetailInfoPromise (detailsApi: string) {
    return new Promise((resolve, reject) => {
      request(detailsApi, (error, response, body) => {
        if (error) {
          reject(error);
        }
        const code = response && response.statusCode;
        let err: string;
        if (code !== 200) {
          err = 'Response status code: ' + code;
          reject(err);
        } else {
          let detailInfo;
          try {
            detailInfo = JSON.parse(body);
          } catch (e) {
            reject('JSON parse error.');
            return;
          }
          resolve(detailInfo);
        }
      });
    });
  }

  let uniqKey = 0;
  function newKey (prefix?: string): string {
    let key = prefix || '';
    uniqKey++;
    return prefix + uniqKey;
  }
}

export default item;
