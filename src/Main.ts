import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as log4js from 'log4js';

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
    // this._readConfig();
    const p1 = new Promise((resolve, reject) => {
      setTimeout(function() {
        resolve('hello');
      }, 1000);
    });
    const p2 = new Promise((resolve, reject) => {
      const b = Math.random() > 0.5;
      setTimeout(function() {
        b ? resolve('world'): reject('What the fxxk!');
      }, 2000);
    });
    p1
      .then((data) => {
        log.debug(data.toString());
        return p2;
      })
      .then((data) => {
        log.debug(data.toString());
      })
      .catch((err) => {
        log.error(err.toString());
      });
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
