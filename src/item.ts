import * as request from 'request';
import * as cheerio from 'cheerio';
import * as gm from 'gm';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import logger from './logger';
import {ASSETS_PATH, ROOT_PATH, CONFIG_PATH} from './paths';

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
    label: string;
    value: string;
    operator?: string;
  }

  interface IDetailInfo {
    attrs: IDetailAttr[];
    bookAttrs: IDetailAttr[];
  }

  const detailTmpl = getDetailTemplate();
  const DESCRIPTION_MAX_LENGTH = 70;

  export function getItemPromise (url: string, brand: string): Promise<any> {
    logger.info('------>');
    logger.info(`开始获取商品信息: ${url}`);

    let itemInfo: IItemInfo = {};
    let originInfo: IItemInfo;
    return new Promise((resolve, reject) => {
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
          if (checkItemExist(info.goodsno)) {
            return Promise.reject('Exist');
          }
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

          return createDetailPromise(detailInfo, itemInfo);
        })
        .then((newDetailInfo: IDetailInfo) => {
          try {
            const detailHtml = detailTmpl(newDetailInfo);
            const detailFilename = path.join(ASSETS_PATH, 'goods', itemInfo.goodsno, 'detail.html');
            fs.writeFileSync(path.join(ASSETS_PATH, 'goods', itemInfo.goodsno, 'detail.html'), detailHtml, 'utf-8');
            const detailUrl = path.relative(ROOT_PATH, detailFilename);
            itemInfo.detailUrl = formatPath(detailUrl);
          } catch (e) {
            logger.error('创建详情页 detail.html 文件出错.');
            return Promise.reject(e);
          }
          logger.info('详情页 detail.html 创建成功.');
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
          logger.info('<------');
          resolve(itemInfo.goodsno);
        })
        .catch(err => {
          if (_.includes(err, 'Exist')) {
            logger.warn('商品信息已存在:', itemInfo.goodsno);
            reject(err);
            return;
          }
          logger.error(err);
          reject(err);
        });
    });
  }

  function createDetailPromise (detailInfo: IDetailInfo, itemInfo: IItemInfo): Promise<IDetailInfo> {
    let goodsno = itemInfo.goodsno;
    let newDetailInfo = (<IDetailInfo>{});
    let {attrs, bookAttrs} = detailInfo;
    let images: [string, string][] = [];
    newDetailInfo.attrs = attrs;
    newDetailInfo.bookAttrs = _.map(bookAttrs, (bookAttr) => {
      let newBookAttr = _.clone(<IDetailAttr>bookAttr);
      let $ = cheerio.load(`<div id="cheerio-wrapper">${bookAttr.value}</div>`);
      let $wrapper = $('#cheerio-wrapper');
      let description: string;
      $('img').each((i, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        const newSrc = `detail-imgs/${newKey(goodsno + '_')}.jpg`;
        $el.removeAttr('title');
        $el.attr('src', newSrc);
        images.push([src, path.join(ASSETS_PATH, 'goods', goodsno, newSrc)]);
      });
      if (bookAttr.label === '编辑推荐') {
        description = _.trim($wrapper.text()).split('　')[0];
        if (description.length > DESCRIPTION_MAX_LENGTH) {
          description = description.substr(0, DESCRIPTION_MAX_LENGTH);
        }
        if (description) {
          itemInfo.description = description;
        }
      }
      newBookAttr.value = global.unescape($wrapper.html().replace(/&#x/g, '%u').replace(/;/g, ''));
      return newBookAttr;
    });
    const detailFile = saveJson(newDetailInfo, path.join(ASSETS_PATH, 'goods', goodsno, 'detail.json'));
    return new Promise<IDetailInfo>((resolve, reject) => {
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

  function getDetailTemplate () {
    const tplStr = fs.readFileSync(path.join(CONFIG_PATH, 'detail-template.ejs'), 'utf-8');
    return _.template(tplStr);
  }

  let uniqKey = 0;
  function newKey (prefix?: string): string {
    let key = prefix || '';
    uniqKey++;
    return prefix + uniqKey;
  }
}

export default item;
