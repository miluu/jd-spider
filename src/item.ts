import * as request from 'request';
import * as cheerio from 'cheerio';
import * as _ from 'lodash';
import logger from './logger';
import * as Promise from 'bluebird';

module item {
  export function getItem (url: string) {
    logger.info(`Start get item from page: ${url}`);
    analysePagePromise(url)
      .then(body => {
        logger.debug(body);
      })
      .catch(err => {
        logger.error(err);
      });
  }

  function analysePagePromise (url: string): Promise<any> {
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

  function analyseHtml (html: string) {
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
      return _.trim($el.attr('imgsrc') || $el.attr('src'));
    });
    return {
      goodsno: _.trim(goodsno),
      title: _.trim(title),
      price: parseFloat(_.trim(price)),
      description: _.trim(description),
      detailsApi,
      imgs
    };
  }
}

export default item;
