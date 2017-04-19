import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as log4js from 'log4js';
import * as request from 'request';

log4js.configure({
  appenders: [
    {type: 'console'},
    {type: 'file', filename: path.join(__dirname, '../log/jd-spider.log'), category: 'spider'}
  ]
});
const log = log4js.getLogger('spider');

log.info('App start...')
export default class Main {
  constructor() {
      const ws = fs.createWriteStream(path.join(__dirname, '../files/img/test.jpg'));
      request('https://m.360buyimg.com/n0/jfs/t4216/312/1944832528/564602/49935d7f/58c8be3eNf82db2f7.jpg!q70.jpg')
        .on('data', (data) => {
          log.debug('get data.')
        })
        .on('request', () => {
          log.info('start download image.')
        })
        .on('error', (err) => {
          log.error('download error.')
        })
        .on('complete', () => {
          log.info('image downloaded.')
        })
        .pipe(ws);
  }

  private _readConfig () {
    const configPaht = path.join(__dirname, '../files/info/config.json');
    const imagePath = path.join(__dirname, '../files/img/test.jpg');
    const configStr = fs.readFileSync(configPaht, 'utf-8');
    const config = JSON.parse(configStr);
    http.get(config.imgUrl, res => {
      let imgData = '';
      res.setEncoding('binary');
      // res.on('data', chunk => {
      //   imgData += chunk;
      // });
      // res.once('end', () => {
      //   fs.writeFileSync(imagePath, imgData, 'binary');
      //   console.log('image saved');
      // });
    });
  }
}
