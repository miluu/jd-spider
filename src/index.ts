import * as superagent from 'superagent';
import * as cheerio from 'cheerio';
import * as _ from 'lodash';

import {AA} from './test';

console.log('Start...');

const a = new AA('J8');
a.say();

superagent.get('https://cnodejs.org/')
  .end((err, res) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Finish:');
    const $ = cheerio.load(res.text);
    const items: any[] = [];
    $('#topic_list .topic_title').each ((idx, element) => {
      const $element = $(element);
      items.push({
        title: $element.attr('title'),
        href: $element.attr('href')
      });
    });
    const output = _.map(items, (item, index) => `${index + 1}. ${item.title}`);
    console.log(output.join('\r\n'));
  });
