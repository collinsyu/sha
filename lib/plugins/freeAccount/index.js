'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const log4js = require('log4js');
const logger = log4js.getLogger('freeAccount');

const config = appRequire('services/config').all();
const cron = appRequire('init/cron');
const knex = appRequire('init/knex').knex;
const manager = appRequire('services/manager');
const port = config.plugins.freeAccount.port;
let flow = config.plugins.freeAccount.flow;
if (flow.toString().trim().substr(-1).toUpperCase() === 'K') {
  flow = +flow.substr(0, flow.length - 1) * 1000;
}
if (flow.toString().trim().substr(-1).toUpperCase() === 'M') {
  flow = +flow.substr(0, flow.length - 1) * 1000 * 1000;
}
if (flow.toString().trim().substr(-1).toUpperCase() === 'G') {
  flow = +flow.substr(0, flow.length - 1) * 1000 * 1000 * 1000;
}
flow = +flow;
let time = config.plugins.freeAccount.time;
if (time.toString().trim().substr(-1).toUpperCase() === 'M') {
  time = +time.substr(0, time.length - 1) * 60 * 1000;
}
if (time.toString().trim().substr(-1).toUpperCase() === 'H') {
  time = +time.substr(0, time.length - 1) * 60 * 60 * 1000;
}
time = +time;
const address = config.plugins.freeAccount.address;
const method = config.plugins.freeAccount.method;
const analytics = config.plugins.freeAccount.analytics || '';
const password = config.plugins.freeAccount.password || '';

let currentPassword = '';
let updateTime = Date.now();
let currentPort = 0;

const randomPort = () => {
  const portString = port.toString();
  const portArray = [];
  portString.split(',').forEach(f => {
    if (f.indexOf('-') < 0) {
      portArray.push(+f);
    } else {
      const start = f.split('-')[0];
      const end = f.split('-')[1];
      for (let p = +start; p <= +end; p++) {
        portArray.push(p);
      }
    }
  });
  const random = Math.floor(Math.random() * portArray.length);
  currentPort = portArray[random];
  return currentPort;
};
randomPort();

const randomPassword = () => {
  updateTime = Date.now();
  currentPassword = password + Math.random().toString().substr(2, 10);
  return currentPassword;
};

const prettyFlow = number => {
  if (number >= 0 && number < 1000) {
    return number + ' B';
  } else if (number >= 1000 && number < 1000 * 1000) {
    return (number / 1000).toFixed(1) + ' KB';
  } else if (number >= 1000 * 1000 && number < 1000 * 1000 * 1000) {
    return (number / (1000 * 1000)).toFixed(2) + ' MB';
  } else if (number >= 1000 * 1000 * 1000 && number < 1000 * 1000 * 1000 * 1000) {
    return (number / (1000 * 1000 * 1000)).toFixed(3) + ' GB';
  } else if (number >= 1000 * 1000 * 1000 * 1000 && number < 1000 * 1000 * 1000 * 1000 * 1000) {
    return (number / (1000 * 1000 * 1000 * 1000)).toFixed(3) + ' TB';
  } else {
    return number + '';
  }
};

const prettyTime = number => {
  const numberOfSecond = Math.ceil(number / 1000);
  if (numberOfSecond >= 0 && numberOfSecond < 60) {
    return numberOfSecond + 's';
  } else if (numberOfSecond >= 60 && numberOfSecond < 3600) {
    return Math.floor(numberOfSecond / 60) + 'm' + numberOfSecond % 60 + 's';
  } else if (numberOfSecond >= 3600) {
    const hour = Math.floor(numberOfSecond / 3600);
    const min = Math.floor((numberOfSecond - 3600 * hour) / 60);
    const sec = (numberOfSecond - 3600 * hour) % 60;
    return hour + 'h' + min + 'm' + sec + 's';
  } else {
    return numberOfSecond + 's';
  }
};

const getKey = (() => {
  var _ref = _asyncToGenerator(function* (key, defaultValue) {
    try {
      const result = yield knex('freeAccount').select().where({
        key
      }).then(function (success) {
        return success[0];
      });
      return JSON.parse(result.value);
    } catch (err) {
      yield knex('freeAccount').insert({
        key,
        value: JSON.stringify(defaultValue)
      });
      return getKey(key);
    }
  });

  return function getKey(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const setKey = (() => {
  var _ref2 = _asyncToGenerator(function* (key, value) {
    try {
      yield getKey(key);
      yield knex('freeAccount').update({
        value: JSON.stringify(value)
      }).where({
        key
      });
    } catch (err) {
      yield knex('freeAccount').insert({
        key,
        value: JSON.stringify(value)
      });
    }
  });

  return function setKey(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
})();

const checkPort = (() => {
  var _ref3 = _asyncToGenerator(function* () {
    let changePasswordMark = false;
    const accounts = yield manager.send({ command: 'list' });
    accounts.forEach(function (account) {
      if (account.port !== currentPort) {
        manager.send({ command: 'del', port: account.port });
      }
    });
    const exists = accounts.filter(function (f) {
      return f.port === currentPort;
    })[0];
    if (!exists) {
      yield manager.send({ command: 'add', port: currentPort, password: randomPassword() });
      yield setKey('create', { time: Date.now() });
    } else {
      logger.info('port: ' + exists.port + ', password: ' + exists.password);
      currentPassword = exists.password;
      const createTime = (yield getKey('create', { time: Date.now() })).time;
      logger.info('time: ' + prettyTime(time - Date.now() + createTime) + ' left');
      if (Date.now() - createTime >= time) {
        changePasswordMark = true;
      }
      const currentFlow = (yield getKey('flow', { flow: 0 })).flow;
      const newFlow = yield manager.send({
        command: 'flow',
        options: {
          startTime: 0, endTime: Date.now(), clear: true
        }
      }).then(function (success) {
        success.forEach(function (f) {
          if (f.port !== currentPort) {
            manager.send({ command: 'del', port: f.port });
          }
        });
        const myFlow = success.filter(function (f) {
          return f.port === currentPort;
        })[0];
        if (myFlow) {
          return myFlow.sumFlow;
        } else {
          return 0;
        }
      });
      logger.info('flow: ' + prettyFlow(currentFlow + newFlow) + '/' + prettyFlow(flow) + ' ' + Math.ceil((currentFlow + newFlow) * 100 / flow) + '%');
      yield setKey('flow', { flow: currentFlow + newFlow });
      const sumFlow = (yield getKey('sumFlow', { flow: 0 })).flow;
      yield setKey('sumFlow', { flow: sumFlow + newFlow });
      logger.info('sumFlow: ' + prettyFlow(sumFlow + newFlow));
      const ips = yield manager.send({ command: 'ip', port: currentPort });
      logger.info(ips);
      if (currentFlow + newFlow >= flow) {
        changePasswordMark = true;
      }
      if (changePasswordMark) {
        yield manager.send({ command: 'add', port: randomPort(), password: randomPassword() });
        yield setKey('create', { time: Date.now() });
        yield setKey('flow', { flow: 0 });
      }
    }
  });

  return function checkPort() {
    return _ref3.apply(this, arguments);
  };
})();

checkPort();
cron.minute(() => {
  checkPort();
}, 1);

const path = require('path');
const express = require('express');
const app = express();
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.set('views', path.resolve('./plugins/freeAccount/views'));
app.set('trust proxy', 'loopback');
app.use('/libs', express.static(path.resolve('./plugins/freeAccount/libs')));
const listenPort = config.plugins.freeAccount.listen.split(':')[1];
const listenHost = config.plugins.freeAccount.listen.split(':')[0];
app.get('/', (req, res) => {
  logger.info(`[${req.ip}] /`);
  return res.render('index', {
    qrcode: 'ss://' + Buffer.from(`${method}:${currentPassword}@${address}:${currentPort}`).toString('base64'),
    analytics
  });
});
app.get('/updateTime', (req, res) => {
  logger.info(`[${req.ip}] /updateTime`);
  return res.send({ time: updateTime });
});
app.listen(listenPort, listenHost, () => {
  logger.info(`server start at ${listenHost}:${listenPort}`);
}).on('error', err => {
  logger.error('express server error: ' + err);
  process.exit(1);
});