'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const tg = appRequire('plugins/webgui_telegram/index');
const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const isUser = appRequire('plugins/webgui_telegram/index').isUser;
const isNotUserOrAdmin = appRequire('plugins/webgui_telegram/index').isNotUserOrAdmin;
const config = appRequire('services/config').all();
const knex = appRequire('init/knex').knex;

const isHelp = message => {
  if (!message.message || !message.message.text) {
    return false;
  }
  if (!message.message || !message.message.chat || !message.message.chat.type === 'private') {
    return false;
  }
  if (message.message.text.trim() !== 'help' && message.message.text !== '/start') {
    return false;
  }
  return true;
};

telegram.on('message', (() => {
  var _ref = _asyncToGenerator(function* (message) {
    if (!isHelp(message)) {
      return;
    }
    const telegramId = message.message.chat.id.toString();
    const userStatus = yield tg.getUserStatus(telegramId);
    const title = (yield knex('webguiSetting').select().where({
      key: 'base'
    }).then(function (success) {
      if (!success.length) {
        return Promise.reject('settings not found');
      }
      success[0].value = JSON.parse(success[0].value);
      return success[0].value;
    })).title;
    const site = config.plugins.webgui.site;
    if (userStatus.status === 'empty') {
      tg.sendKeyboard(`欢迎使用 ${title}，\n\n请在这里输入您的邮箱以接收验证码来注册账号\n\n或者点击以下按钮访问网页版`, telegramId, {
        inline_keyboard: [[{
          text: '登录网页版',
          url: site
        }]]
      });
    } else if (userStatus.status === 'normal') {
      tg.sendMessage('指令列表：\n\naccount: 显示ss账号信息\nlogin: 快捷登录网页版', telegramId);
    }
  });

  return function (_x) {
    return _ref.apply(this, arguments);
  };
})());