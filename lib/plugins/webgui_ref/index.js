'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;

const getRefSetting = (() => {
  var _ref = _asyncToGenerator(function* () {
    const setting = yield knex('webguiSetting').select().where({
      key: 'webgui_ref'
    }).then(function (success) {
      if (!success.length) {
        return Promise.reject('settings not found');
      }
      success[0].value = JSON.parse(success[0].value);
      return success[0].value;
    });
    return setting;
  });

  return function getRefSetting() {
    return _ref.apply(this, arguments);
  };
})();

const addRefCode = (() => {
  var _ref2 = _asyncToGenerator(function* (userId, max = 3) {
    const code = Math.random().toString().substr(2, 10);
    yield knex('webgui_ref_code').insert({
      code,
      sourceUserId: userId,
      maxUser: max,
      time: Date.now()
    });
  });

  return function addRefCode(_x) {
    return _ref2.apply(this, arguments);
  };
})();

const visitRefCode = (() => {
  var _ref3 = _asyncToGenerator(function* (code) {
    const setting = yield getRefSetting();
    if (!setting.useRef) {
      return false;
    }
    const codeInfo = (yield knex('webgui_ref_code').where({ code }))[0];
    if (!codeInfo) {
      return false;
    }
    const sourceUserInfo = (yield knex('user').where({ id: codeInfo.sourceUserId }))[0];
    if (!sourceUserInfo) {
      return;
    }
    const currentRefUser = yield knex('webgui_ref').where({ codeId: codeInfo.id });
    if (currentRefUser.length >= codeInfo.maxUser) {
      return false;
    }
    yield knex('webgui_ref_code').where({ code }).increment('visit', 1);
    return true;
  });

  return function visitRefCode(_x2) {
    return _ref3.apply(this, arguments);
  };
})();

const checkRefCodeForSignup = (() => {
  var _ref4 = _asyncToGenerator(function* (code) {
    const setting = yield getRefSetting();
    if (!setting.useRef) {
      return false;
    }
    if (!setting.useWhenSignupClose) {
      return false;
    }
    const codeInfo = (yield knex('webgui_ref_code').where({ code }))[0];
    if (!codeInfo) {
      return false;
    }
    const sourceUserInfo = (yield knex('user').where({ id: codeInfo.sourceUserId }))[0];
    if (!sourceUserInfo) {
      return;
    }
    const currentRefUser = yield knex('webgui_ref').where({ codeId: codeInfo.id });
    if (currentRefUser.length >= codeInfo.maxUser) {
      return false;
    }
    return true;
  });

  return function checkRefCodeForSignup(_x3) {
    return _ref4.apply(this, arguments);
  };
})();

const addRefUser = (() => {
  var _ref5 = _asyncToGenerator(function* (code, userId) {
    try {
      const setting = yield getRefSetting();
      if (!setting.useRef) {
        return;
      }
      const codeInfo = (yield knex('webgui_ref_code').where({ code }))[0];
      if (!codeInfo) {
        return;
      }
      const sourceUserInfo = (yield knex('user').where({ id: codeInfo.sourceUserId }))[0];
      if (!sourceUserInfo) {
        return;
      }
      const currentRefUser = yield knex('webgui_ref').where({ codeId: codeInfo.id });
      if (currentRefUser.length >= codeInfo.maxUser) {
        return;
      }
      yield knex('webgui_ref').insert({
        codeId: codeInfo.id,
        userId,
        time: Date.now()
      });
      yield knex('user').update({ group: sourceUserInfo.group }).where({ id: userId });
    } catch (err) {
      console.error(err);
    }
  });

  return function addRefUser(_x4, _x5) {
    return _ref5.apply(this, arguments);
  };
})();

exports.addRefCode = addRefCode;
exports.visitRefCode = visitRefCode;
exports.addRefUser = addRefUser;
exports.checkRefCodeForSignup = checkRefCodeForSignup;

const setDefaultValue = (key, value) => {
  knex('webguiSetting').select().where({
    key
  }).then(success => {
    if (success.length) {
      return;
    }
    return knex('webguiSetting').insert({
      key,
      value: JSON.stringify(value)
    });
  }).then();
};
setDefaultValue('webgui_ref', {
  useRef: false,
  useWhenSignupClose: false,
  refNumber: 1,
  refUserNumber: 1
});