const request = require('request');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

let pcPageUrl = 'https://item.jd.com/12190993213.html';
request({
  url: pcPageUrl,
  encoding: null
}, (error, response, body) => {
  if (error) {
    console.error(error);
    return;
  }
  const code = response && response.statusCode;
  let err;
  if (code !== 200) {
    err = 'Response status code: ' + code;
    console.error(err);
    return;
  }
  const html = iconv.decode(body, 'gb2312');
  const $ = cheerio.load(html);
  let $crumbs;
  if ($('.crumb').length) {
    $crumbs = $('.crumb .item').not('.sep').not('.first').not('.ellipsis');
  } else {
    $crumbs = $('.breadcrumb').children('span').first().children('a');
  }
  const tags = [];
  $crumbs.each((i, el) => {
    tags.push(_.trim($(el).text()));
  });
  console.log(tags);
});
