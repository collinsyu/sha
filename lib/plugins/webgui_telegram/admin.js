'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const knex = appRequire('init/knex').knex;

const getAdmin = (() => {
  var _ref = _asyncToGenerator(function* () {
    const exists = yield knex('user').where({
      type: 'admin'
    }).then(function (success) {
      return success[0];
    });
    if (!exists || !exists.telegram) {
      return;
    }
    return exists.telegram;
  });

  return function getAdmin() {
    return _ref.apply(this, arguments);
  };
})();

const push = (() => {
  var _ref2 = _asyncToGenerator(function* (message) {
    const telegramId = yield getAdmin();
    telegramId && telegram.emit('send', +telegramId, message);
  });

  return function push(_x) {
    return _ref2.apply(this, arguments);
  };
})();

exports.push = push;