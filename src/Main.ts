import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export default class Main {
  constructor() {
    this._readConfig();
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
