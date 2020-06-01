'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const config = appRequire('services/config').all();
const token = config.plugins.webgui_telegram.token;
const rp = require('request-promise');
const url = `https://api.telegram.org/bot${token}/`;

const sendMessage = (text, chat_id, reply_to_message_id) => {
  return rp({
    method: 'GET',
    uri: url + 'sendMessage',
    qs: {
      chat_id,
      text,
      reply_to_message_id
    },
    simple: false
  });
};

const sendMarkdown = (text, chat_id) => {
  return rp({
    method: 'GET',
    uri: url + 'sendMessage',
    qs: {
      chat_id,
      text,
      parse_mode: 'Markdown'
    },
    simple: false
  });
};

const sendKeyboard = (text, chat_id, keyboard) => {
  return rp({
    method: 'GET',
    uri: url + 'sendMessage',
    qs: {
      chat_id,
      text,
      reply_markup: JSON.stringify(keyboard)
    },
    simple: false
  });
};

const sendPhoto = (photo, chat_id) => {
  return rp({
    method: 'GET',
    uri: url + 'sendPhoto',
    qs: {
      chat_id,
      photo
    },
    simple: false
  });
};

const EventEmitter = require('events');
class Telegram extends EventEmitter {}
const telegram = new Telegram();

telegram.on('reply', (message, text) => {
  const chat_id = message.message.chat.id;
  const reply_to_message_id = message.message.message_id;
  sendMessage(text, chat_id, reply_to_message_id);
});
telegram.on('send', (chat_id, text) => {
  sendMessage(text, chat_id);
});
telegram.on('markdwon', (chat_id, text) => {
  sendMarkdown(text, chat_id);
});
telegram.on('keyboard', (chat_id, text, keyboard) => {
  sendKeyboard(text, chat_id, JSON.stringify(keyboard));
});
telegram.on('photo', (chat_id, photo) => {
  sendPhoto(photo, chat_id);
});

const setUpdateId = (() => {
  var _ref = _asyncToGenerator(function* (id) {
    try {
      const result = yield knex('webgui_telegram').select(['value']).where({ key: 'updateId' });
      if (result.length === 0) {
        yield knex('webgui_telegram').insert({
          key: 'updateId',
          value: id || 1
        });
      } else {
        yield knex('webgui_telegram').where({ key: 'updateId' }).update({
          value: id
        });
      }
      return id;
    } catch (err) {
      return Promise.reject(err);
    }
  });

  return function setUpdateId(_x) {
    return _ref.apply(this, arguments);
  };
})();

const getUpdateId = (() => {
  var _ref2 = _asyncToGenerator(function* () {
    try {
      const result = yield knex('webgui_telegram').select(['value']).where({ key: 'updateId' });
      if (result.length === 0) {
        return 1;
      } else {
        return result[0].value;
      }
    } catch (err) {
      return Promise.reject(err);
    }
  });

  return function getUpdateId() {
    return _ref2.apply(this, arguments);
  };
})();

const getMessage = (() => {
  var _ref3 = _asyncToGenerator(function* () {
    const updateId = yield getUpdateId();
    try {
      const result = yield rp({
        method: 'GET',
        uri: url + 'getUpdates',
        qs: {
          offset: updateId,
          timeout: 30
        },
        simple: false
      });
      const resultObj = JSON.parse(result);
      if (resultObj.ok && resultObj.result.length) {
        resultObj.result.forEach(function (message) {
          console.log(message);
          telegram.emit('message', message);
        });
      }
      if (resultObj.result.length) {
        yield setUpdateId(resultObj.result[resultObj.result.length - 1].update_id + 1);
      }
    } catch (err) {
      return;
    }
  });

  return function getMessage() {
    return _ref3.apply(this, arguments);
  };
})();

const getMe = (() => {
  var _ref4 = _asyncToGenerator(function* () {
    const result = yield rp({
      method: 'GET',
      uri: url + 'getMe',
      qs: {},
      simple: false
    });
    return JSON.parse(result);
  });

  return function getMe() {
    return _ref4.apply(this, arguments);
  };
})();

const isUser = (() => {
  var _ref5 = _asyncToGenerator(function* (telegramId) {
    const exists = yield knex('user').where({
      telegram: telegramId,
      type: 'normal'
    }).then(function (success) {
      return success[0];
    });
    if (!exists) {
      return Promise.reject('not a tg user');
    }
    return exists.id;
  });

  return function isUser(_x2) {
    return _ref5.apply(this, arguments);
  };
})();

const isAdmin = (() => {
  var _ref6 = _asyncToGenerator(function* (telegramId) {
    const exists = yield knex('user').where({
      telegram: telegramId,
      type: 'admin'
    }).then(function (success) {
      return success[0];
    });
    if (!exists) {
      return Promise.reject('not a tg user');
    }
    return exists.id;
  });

  return function isAdmin(_x3) {
    return _ref6.apply(this, arguments);
  };
})();

const isNotUserOrAdmin = (() => {
  var _ref7 = _asyncToGenerator(function* (telegramId) {
    const exists = yield knex('user').where({
      telegram: telegramId
    }).then(function (success) {
      return success[0];
    });
    if (exists) {
      return Promise.reject('is a user');
    }
    return;
  });

  return function isNotUserOrAdmin(_x4) {
    return _ref7.apply(this, arguments);
  };
})();

const getUserStatus = (() => {
  var _ref8 = _asyncToGenerator(function* (telegramId) {
    const user = yield knex('user').where({
      telegram: telegramId
    }).then(function (success) {
      return success[0];
    });
    if (!user) {
      return { status: 'empty' };
    } else {
      return { status: user.type, id: user.id };
    }
  });

  return function getUserStatus(_x5) {
    return _ref8.apply(this, arguments);
  };
})();

const pull = () => {
  return getMessage().then(() => {
    return pull();
  }).catch(() => {
    return pull();
  });
};
pull();

exports.telegram = telegram;

exports.getMe = getMe;
exports.isUser = isUser;
exports.isAdmin = isAdmin;
exports.isNotUserOrAdmin = isNotUserOrAdmin;
exports.getUserStatus = getUserStatus;

exports.sendKeyboard = sendKeyboard;
exports.sendMarkdown = sendMarkdown;
exports.sendMessage = sendMessage;
exports.sendPhoto = sendPhoto;

appRequire('plugins/webgui_telegram/user');
appRequire('plugins/webgui_telegram/help');
appRequire('plugins/webgui_telegram/account');
appRequire('plugins/webgui_telegram/flow');