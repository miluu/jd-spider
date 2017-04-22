import * as path from 'path';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import {
  CONFIG_PATH,
  LOG_PATH
} from './paths';
import util from './util';

let config = util.readJson(path.join(CONFIG_PATH, 'log4js-config.json'));
if (config) {
  config = _.map(config, (obj: any) => {
    if (obj.type === 'file') {
      obj.filename = path.join(LOG_PATH, obj.filename || 'log');
    }
    return obj;
  });
}

log4js.configure({
  appenders: config
});


const logger = log4js.getLogger('spider');
logger.setLevel('INFO');
export default logger;
