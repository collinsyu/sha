'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const moment = require('moment');
const flow = appRequire('plugins/flowSaver/flow');
const tg = appRequire('plugins/webgui_telegram/index');
const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const cron = appRequire('init/cron');
const log4js = require('log4js');
const logger = log4js.getLogger('telegram');

const getUserAccount = userId => {
  return knex('account_plugin').where({
    userId
  });
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

const getUsers = (() => {
  var _ref = _asyncToGenerator(function* () {
    const users = yield knex('user').where({ type: 'normal' }).whereNotNull('telegram');
    users.forEach((() => {
      var _ref2 = _asyncToGenerator(function* (user) {
        const accounts = yield getUserAccount(user.id);
        const start = moment().add(-1, 'd').hour(0).minute(0).second(0).millisecond(0).toDate().getTime();
        const end = moment().hour(0).minute(0).second(0).millisecond(0).toDate().getTime();
        accounts.forEach((() => {
          var _ref3 = _asyncToGenerator(function* (account) {
            const myFlow = yield flow.getFlowFromSplitTime(null, account.id, start, end);
            const message = `昨日流量统计：[${account.port}] ${prettyFlow(myFlow)}`;
            logger.info(`1111${message}`);
            // telegram.emit('send', +user.telegram, message);
            tg.sendMessage(message, +user.telegram);
          });

          return function (_x2) {
            return _ref3.apply(this, arguments);
          };
        })());
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    })());
  });

  return function getUsers() {
    return _ref.apply(this, arguments);
  };
})();

cron.cron(getUsers, '0 9 * * *');