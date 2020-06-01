'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;

const addRefCode = (() => {
  var _ref = _asyncToGenerator(function* (userId, max = 3) {
    const code = Math.random().toString().substr(2, 10);
    yield knex('webgui_ref_code').insert({
      code,
      sourceUserId: userId,
      maxUser: max,
      time: Date.now()
    });
  });

  return function addRefCode(_x) {
    return _ref.apply(this, arguments);
  };
})();

const getRefSetting = (() => {
  var _ref2 = _asyncToGenerator(function* () {
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
    return _ref2.apply(this, arguments);
  };
})();

const getRefCode = (() => {
  var _ref3 = _asyncToGenerator(function* (userId) {
    const setting = yield getRefSetting();
    const exists = yield knex('webgui_ref_code').where({ sourceUserId: userId });
    if (exists.length < setting.refNumber) {
      for (let i = 0; i < setting.refNumber - exists.length; i++) {
        yield addRefCode(userId, setting.refUserNumber);
      }
    }
    const code = yield knex('webgui_ref_code').select(['webgui_ref_code.code as code', 'webgui_ref_code.maxUser as maxUser', knex.raw('count(webgui_ref.codeId) as count')]).where({ sourceUserId: userId }).leftJoin('webgui_ref', 'webgui_ref_code.id', 'webgui_ref.codeId').groupBy('webgui_ref_code.id');
    return code;
  });

  return function getRefCode(_x2) {
    return _ref3.apply(this, arguments);
  };
})();

const getRefUser = (() => {
  var _ref4 = _asyncToGenerator(function* (userId) {
    const user = yield knex('webgui_ref').select(['webgui_ref_code.code as code', 'user.id as id', 'user.email as email', 'webgui_ref.time as time']).where({ 'webgui_ref_code.sourceUserId': userId }).leftJoin('webgui_ref_code', 'webgui_ref.codeId', 'webgui_ref_code.id').leftJoin('user', 'webgui_ref.userId', 'user.id').orderBy('webgui_ref.time', 'DESC');
    return user;
  });

  return function getRefUser(_x3) {
    return _ref4.apply(this, arguments);
  };
})();

const getRefSourceUser = (() => {
  var _ref5 = _asyncToGenerator(function* (userId) {
    const user = yield knex('webgui_ref_code').select(['user.id as id', 'user.email as email']).where({ 'webgui_ref.userId': userId }).leftJoin('webgui_ref', 'webgui_ref.codeId', 'webgui_ref_code.id').leftJoin('user', 'webgui_ref_code.sourceUserId', 'user.id');
    return user[0];
  });

  return function getRefSourceUser(_x4) {
    return _ref5.apply(this, arguments);
  };
})();

const setRefForUser = (() => {
  var _ref6 = _asyncToGenerator(function* (sourceUserId, refUserId, code) {
    if (sourceUserId === refUserId) {
      return Promise.reject('id can not be same');
    }
    const my = yield knex('webgui_ref_code').select(['webgui_ref_code.id as id']).where({
      'webgui_ref_code.code': code,
      'webgui_ref_code.sourceUserId': sourceUserId
    }).then(function (s) {
      return s[0];
    });
    yield knex('webgui_ref').insert({
      codeId: my.id,
      userId: refUserId,
      time: Date.now()
    });
  });

  return function setRefForUser(_x5, _x6, _x7) {
    return _ref6.apply(this, arguments);
  };
})();

const deleteRefCode = (() => {
  var _ref7 = _asyncToGenerator(function* (code) {
    const codeInfo = yield knex('webgui_ref_code').where({ code }).then(function (s) {
      return s[0];
    });
    yield knex('webgui_ref_code').delete().where({ id: codeInfo.id });
    yield knex('webgui_ref').delete().where({ codeId: codeInfo.id });
  });

  return function deleteRefCode(_x8) {
    return _ref7.apply(this, arguments);
  };
})();

const deleteRefUser = (() => {
  var _ref8 = _asyncToGenerator(function* (sourceUserId, refUserId) {
    const refInfo = yield knex('webgui_ref').select(['webgui_ref.id as id']).leftJoin('webgui_ref_code', 'webgui_ref_code.id', 'webgui_ref.codeId').where({
      'webgui_ref_code.sourceUserId': sourceUserId,
      'webgui_ref.userId': refUserId
    }).then(function (s) {
      return s[0];
    });
    yield knex('webgui_ref').delete().where({ id: refInfo.id });
  });

  return function deleteRefUser(_x9, _x10) {
    return _ref8.apply(this, arguments);
  };
})();

exports.setRefForUser = setRefForUser;
exports.addRefCode = addRefCode;
exports.getRefCode = getRefCode;
exports.getRefUser = getRefUser;
exports.getRefSourceUser = getRefSourceUser;
exports.deleteRefCode = deleteRefCode;
exports.deleteRefUser = deleteRefUser;