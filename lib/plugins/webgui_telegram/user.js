'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const tg = appRequire('plugins/webgui_telegram/index');
const isNotUserOrAdmin = appRequire('plugins/webgui_telegram/index').isNotUserOrAdmin;
const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const getMe = appRequire('plugins/webgui_telegram/index').getMe;
const knex = appRequire('init/knex').knex;
const user = appRequire('plugins/user/index');
const emailPlugin = appRequire('plugins/email/index');
const account = appRequire('plugins/account/index');

const isUserBindMessage = message => {
  if (!message.message || !message.message.text) {
    return false;
  }
  if (!message.message || !message.message.chat || !message.message.chat.type === 'private') {
    return false;
  }
  if (!message.message.text.trim().match(/^\d{8}$/)) {
    return false;
  }
  return true;
};

const codes = {};
let fails = [];

telegram.on('message', message => {
  if (isUserBindMessage(message)) {
    let isFailed = true;
    const telegramId = message.message.chat.id.toString();
    fails = fails.filter(f => {
      return Date.now() - f.time <= 10 * 60 * 1000;
    });
    if (fails.filter(f => {
      return f.id === telegramId;
    }).length >= 10) {
      console.log('telegram id is blocked in 10 mins');
      return;
    }
    for (const code in codes) {
      if (codes[code].code === message.message.text.trim()) {
        isFailed = false;
        bindUser(code, message);
      }
    }
    if (isFailed) {
      fails.push({ id: telegramId, time: Date.now() });
    }
  }
});

const bindUser = (() => {
  var _ref = _asyncToGenerator(function* (userId, message) {
    const telegramId = message.message.chat.id.toString();
    if (!telegramId) {
      return Promise.reject('');
    }
    const exists = yield knex('user').where({
      telegram: telegramId
    }).then(function (success) {
      return success[0];
    });
    if (exists) {
      return Promise.reject('');
    }
    yield user.edit({ id: userId }, { telegram: telegramId });
    // telegram.emit('reply', message, 'Telegram账号绑定成功，输入 help 查看使用方法');
    tg.sendMessage('Telegram账号绑定成功，输入 help 查看使用方法', telegramId);
  });

  return function bindUser(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const unbindUser = (() => {
  var _ref2 = _asyncToGenerator(function* (userId) {
    const exists = yield knex('user').where({
      id: userId
    }).then(function (success) {
      return success[0];
    });
    if (!exists) {
      return Promise.reject('');
    }
    if (!exists.telegram) {
      return Promise.reject('');
    }
    yield user.edit({ id: userId }, { telegram: null });
    // telegram.emit('send', +exists.telegram, 'Telegram账号已经解除绑定');
    tg.sendMessage('Telegram账号已经解除绑定', +exists.telegram);
  });

  return function unbindUser(_x3) {
    return _ref2.apply(this, arguments);
  };
})();

exports.getCode = (() => {
  var _ref3 = _asyncToGenerator(function* (userId) {
    const exists = yield knex('user').where({
      id: userId
    }).then(function (success) {
      return success[0];
    });
    if (exists && exists.telegram) {
      return {
        user: exists.telegram
      };
    }
    for (const code in codes) {
      if (Date.now() - codes[code].time > 10 * 60 * 1000) {
        delete codes[code];
      }
    }
    const botInfo = yield getMe();
    if (codes[userId]) {
      return {
        code: codes[userId].code,
        telegram: botInfo.result.username
      };
    } else {
      codes[userId] = {
        code: Math.random().toString().substr(2, 8),
        time: Date.now()
      };
      return {
        code: codes[userId].code,
        telegram: botInfo.result.username
      };
    }
  });

  return function (_x4) {
    return _ref3.apply(this, arguments);
  };
})();

exports.unbindUser = unbindUser;

// 用户注册功能
const isEmail = message => {
  if (!message.message || !message.message.text) {
    return false;
  }
  if (!message.message || !message.message.chat || !message.message.chat.type === 'private') {
    return false;
  }
  if (!message.message.text.trim().match(/^[\w.\-]+@(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)+[a-z]{2,3}$/)) {
    return false;
  }
  return true;
};

const isSignupCodeMessage = message => {
  if (!message.message || !message.message.text) {
    return false;
  }
  if (!message.message || !message.message.chat || !message.message.chat.type === 'private') {
    return false;
  }
  if (!message.message.text.trim().match(/^\d{6}$/)) {
    return false;
  }
  return true;
};

telegram.on('message', (() => {
  var _ref4 = _asyncToGenerator(function* (message) {
    try {
      if (isEmail(message)) {
        const telegramId = message.message.chat.id.toString();
        yield isNotUserOrAdmin(telegramId);
        const setting = yield knex('webguiSetting').select().where({
          key: 'account'
        }).then(function (success) {
          return JSON.parse(success[0].value);
        });
        if (!setting.signUp.isEnable) {
          return Promise.reject();
        }
        const mailSetting = yield knex('webguiSetting').select().where({
          key: 'mail'
        }).then(function (success) {
          return JSON.parse(success[0].value);
        }).then(function (s) {
          return s.code;
        });
        const email = message.message.text;
        const isUserExists = yield knex('user').where({ email }).then(function (s) {
          return s[0];
        });
        if (isUserExists) {
          return;
        }
        yield emailPlugin.sendCode(email, mailSetting.title || 'ss验证码', mailSetting.content || '欢迎新用户注册，\n您的验证码是：', {
          telegramId
        });
        yield tg.sendMessage(`验证码已经发送至[ ${email} ]，输入验证码即可完成注册`, telegramId);
      } else if (isSignupCodeMessage(message)) {
        const telegramId = message.message.chat.id.toString();
        yield isNotUserOrAdmin(telegramId);
        const code = message.message.text.trim();
        const emailInfo = yield emailPlugin.checkCodeFromTelegram(telegramId, code);
        const userId = (yield user.add({
          username: emailInfo.to,
          email: emailInfo.to,
          password: Math.random().toString().substr(2),
          type: 'normal',
          telegramId
        }))[0];
        const setting = yield knex('webguiSetting').select().where({
          key: 'account'
        }).then(function (success) {
          return JSON.parse(success[0].value);
        });
        const newUserAccount = setting.accountForNewUser;
        if (!setting.accountForNewUser.isEnable) {
          return;
        }
        const getNewPort = (() => {
          var _ref5 = _asyncToGenerator(function* () {
            const setting = yield knex('webguiSetting').select().where({
              key: 'account'
            }).then(function (success) {
              return JSON.parse(success[0].value);
            });
            const port = setting.port;
            if (port.random) {
              const getRandomPort = function getRandomPort() {
                return Math.floor(Math.random() * (port.end - port.start + 1) + port.start);
              };
              let retry = 0;
              let myPort = getRandomPort();
              const checkIfPortExists = function checkIfPortExists(port) {
                let myPort = port;
                return knex('account_plugin').select().where({ port }).then(function (success) {
                  if (success.length && retry <= 30) {
                    retry++;
                    myPort = getRandomPort();
                    return checkIfPortExists(myPort);
                  } else if (success.length && retry > 30) {
                    return Promise.reject('Can not get a random port');
                  } else {
                    return myPort;
                  }
                });
              };
              return checkIfPortExists(myPort);
            } else {
              return knex('account_plugin').select().whereBetween('port', [port.start, port.end]).orderBy('port', 'DESC').limit(1).then(function (success) {
                if (success.length) {
                  return success[0].port + 1;
                }
                return port.start;
              });
            }
          });

          return function getNewPort() {
            return _ref5.apply(this, arguments);
          };
        })();
        const port = yield getNewPort();
        yield account.addAccount(newUserAccount.type || 5, {
          user: userId,
          port,
          password: Math.random().toString().substr(2, 10),
          time: Date.now(),
          limit: newUserAccount.limit || 8,
          flow: (newUserAccount.flow ? newUserAccount.flow : 350) * 1000000,
          server: newUserAccount.server ? JSON.stringify(newUserAccount.server) : null,
          autoRemove: newUserAccount.autoRemove ? 1 : 0,
          multiServerFlow: newUserAccount.multiServerFlow ? 1 : 0
        });
        yield tg.sendMessage(`用户[ ${emailInfo.to} ]注册完成，输入 help 查看具体指令`, telegramId);
      }
    } catch (err) {
      console.log(err);
    }
  });

  return function (_x5) {
    return _ref4.apply(this, arguments);
  };
})());