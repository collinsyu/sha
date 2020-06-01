'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const log4js = require('log4js');
const logger = log4js.getLogger('freeAccount');
const rp = require('request-promise');
const config = appRequire('services/config').all();
const cron = appRequire('init/cron');
const knex = appRequire('init/knex').knex;
const manager = appRequire('services/manager');
const port = config.plugins.freeAccountMiner.port;
const speed = config.plugins.freeAccountMiner.speed;
const publicKey = config.plugins.freeAccountMiner.public;
const privateKey = config.plugins.freeAccountMiner.private;
const analytics = config.plugins.freeAccountMiner.analytics;
const address = config.plugins.freeAccountMiner.address;
const method = config.plugins.freeAccountMiner.method;
const timeout = config.plugins.freeAccountMiner.timeout || 15 * 60 * 1000;
const price = {
  flow: config.plugins.freeAccountMiner.price.flow,
  time: config.plugins.freeAccountMiner.price.time
};

const isOutOfPrice = port => {
  const left = port.balance - (Date.now() - port.create) / 1000 / 60 * price.time - port.flow / 1000000 * price.flow;
  return left <= 0;
};

const randomPort = (() => {
  var _ref = _asyncToGenerator(function* () {
    const portString = port.toString();
    const portArray = [];
    portString.split(',').forEach(function (f) {
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
    const isExists = yield knex('port').where({ port: portArray[random] }).then(function (s) {
      return s[0];
    });
    if (isExists) {
      return yield randomPort();
    }
    return portArray[random];
  });

  return function randomPort() {
    return _ref.apply(this, arguments);
  };
})();

const randomPassword = () => {
  return Math.random().toString().substr(2, 10);
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

const checkPort = (() => {
  var _ref2 = _asyncToGenerator(function* () {
    const accounts = yield manager.send({ command: 'list' });
    const ports = yield knex('port').select();
    ports.forEach(function (port) {
      if (Date.now() - port.update >= timeout) {
        manager.send({ command: 'del', port: port.port });
        knex('port').delete().where({ user: port.user }).then();
        return;
      }
      const exists = accounts.filter(function (f) {
        return f.port === port.port;
      })[0];
      if (!exists && !isOutOfPrice(port)) {
        manager.send({ command: 'add', port: port.port, password: port.password });
      }
      if (exists && isOutOfPrice(port)) {
        manager.send({ command: 'del', port: port.port });
      }
    });
    accounts.forEach(function (account) {
      const exists = ports.filter(function (f) {
        return f.port === account.port;
      })[0];
      if (!exists) {
        manager.send({ command: 'del', port: account.port });
      }
    });
    yield manager.send({
      command: 'flow',
      options: {
        startTime: 0, endTime: Date.now(), clear: true
      }
    }).then(function (success) {
      success.filter(function (f) {
        return f.sumFlow > 0;
      }).forEach(function (account) {
        console.log(account);
        const exists = ports.filter(function (f) {
          return f.port === account.port;
        })[0];
        if (!exists) {
          manager.send({ command: 'del', port: account.port });
        } else if (isOutOfPrice(exists)) {
          manager.send({ command: 'del', port: account.port });
        } else {
          knex('port').where({ port: account.port }).then(function (success) {
            if (!success[0]) {
              return;
            }
            return knex('port').update({
              flow: account.sumFlow + success[0].flow
            }).where({ port: account.port });
          });
        }
      });
    });
  });

  return function checkPort() {
    return _ref2.apply(this, arguments);
  };
})();

const getMine = (() => {
  var _ref3 = _asyncToGenerator(function* (user) {
    return rp({
      method: 'GET',
      uri: 'https://api.coinhive.com/user/balance',
      qs: {
        secret: privateKey,
        name: user
      },
      simple: false
    }).then(function (s) {
      return JSON.parse(s);
    });
  });

  return function getMine(_x) {
    return _ref3.apply(this, arguments);
  };
})();

const resetMine = (() => {
  var _ref4 = _asyncToGenerator(function* (user) {
    return rp({
      method: 'POST',
      uri: 'https://api.coinhive.com/user/reset',
      form: {
        secret: privateKey,
        name: user
      },
      simple: false
    });
  });

  return function resetMine(_x2) {
    return _ref4.apply(this, arguments);
  };
})();

const checkUser = (() => {
  var _ref5 = _asyncToGenerator(function* (user) {
    const time = +user.substr(0, 13);
    if (Date.now() - time >= 24 * 60 * 60 * 1000) {
      yield knex('port').delete().where({ user });
      return {
        status: -1
      };
    }
    const mineData = yield getMine(user);
    if (mineData.success) {
      const exists = yield knex('port').where({ user }).then(function (s) {
        return s[0];
      });
      if (exists) {
        if (Date.now() - exists.update >= timeout) {
          yield knex('port').delete().where({ user });
          yield resetMine(user);
        }
        const update = {
          balance: mineData.balance
        };
        if (mineData.balance > exists.balance) {
          update.update = Date.now();
        }
        yield knex('port').update(update).where({ user });
      } else {
        yield resetMine(user);
        yield knex('port').insert({
          user,
          create: Date.now(),
          update: Date.now(),
          flow: 0,
          balance: mineData.balance,
          port: yield randomPort(),
          password: randomPassword()
        });
      }
    } else {
      return {
        ststus: -2
      };
    }
    return knex('port').where({ user }).then(function (s) {
      const balanceLeft = +(s[0].balance - (Date.now() - s[0].create) / 1000 / 60 * price.time - s[0].flow / 1000000 * price.flow).toFixed(0);
      let flowLeft = +(balanceLeft / price.flow * 1000000).toFixed(0);
      if (flowLeft < 0) {
        flowLeft = 0;
      }
      return {
        status: 0,
        qrcode: 'ss://' + Buffer.from(`${method}:${s[0].password}@${address}:${s[0].port}`).toString('base64'),
        flow: prettyFlow(s[0].flow),
        flowLeft: prettyFlow(flowLeft)
      };
    });
  });

  return function checkUser(_x3) {
    return _ref5.apply(this, arguments);
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
app.set('views', path.resolve('./plugins/freeAccountMiner/views'));
app.set('trust proxy', 'loopback');
app.use('/libs', express.static(path.resolve('./plugins/freeAccountMiner/libs')));
const listenPort = config.plugins.freeAccountMiner.listen.split(':')[1];
const listenHost = config.plugins.freeAccountMiner.listen.split(':')[0];
app.get('/', (req, res) => {
  logger.info(`[${req.ip}] /`);
  return res.render('index', {
    publicKey,
    analytics,
    speed: speed >= 0.5 ? 0.5 : +(1 - speed).toFixed(2)
  });
});

app.get('/account', (req, res) => {
  const user = req.query.user;
  checkUser(user).then(success => {
    return res.send(success);
  });
});

app.listen(listenPort, listenHost, () => {
  logger.info(`server start at ${listenHost}:${listenPort}`);
}).on('error', err => {
  logger.error('express server error: ' + err);
  process.exit(1);
});