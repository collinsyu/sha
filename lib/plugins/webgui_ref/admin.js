'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;

const getRefCode = (() => {
  var _ref = _asyncToGenerator(function* () {
    const code = yield knex('webgui_ref_code').select(['webgui_ref_code.code as code', 'user.email as email', 'webgui_ref_code.maxUser as maxUser', knex.raw('count(webgui_ref.codeId) as count')]).leftJoin('webgui_ref', 'webgui_ref_code.id', 'webgui_ref.codeId').leftJoin('user', 'webgui_ref_code.sourceUserId', 'user.id').groupBy('webgui_ref_code.id').orderBy('webgui_ref_code.time', 'DESC');
    return code;
  });

  return function getRefCode() {
    return _ref.apply(this, arguments);
  };
})();

const getRefCodeAndPaging = (() => {
  var _ref2 = _asyncToGenerator(function* (opt) {
    const page = opt.page || 1;
    const pageSize = opt.pageSize || 20;
    const invalidCode = yield knex('webgui_ref_code').select(['webgui_ref_code.id as id']).leftJoin('user', 'webgui_ref_code.sourceUserId', 'user.id').whereNull('user.id');
    yield knex('webgui_ref_code').delete().whereIn('id', invalidCode.map(function (m) {
      return m.id;
    }));
    let count = knex('webgui_ref_code').select();
    let code = knex('webgui_ref_code').select(['webgui_ref_code.id as id', 'webgui_ref_code.code as code', 'user.email as email', 'webgui_ref_code.visit as visit', 'webgui_ref_code.maxUser as maxUser', knex.raw('count(webgui_ref.codeId) as count')]).leftJoin('webgui_ref', 'webgui_ref_code.id', 'webgui_ref.codeId').leftJoin('user', 'webgui_ref_code.sourceUserId', 'user.id').whereNotNull('user.id').groupBy('webgui_ref_code.id');

    count = yield count.count('id as count').then(function (success) {
      return success[0].count;
    });
    code = yield code.orderBy('webgui_ref_code.time', 'DESC').limit(pageSize).offset((page - 1) * pageSize);
    const maxPage = Math.ceil(count / pageSize);
    return {
      total: count,
      page,
      maxPage,
      pageSize,
      code
    };
  });

  return function getRefCodeAndPaging(_x) {
    return _ref2.apply(this, arguments);
  };
})();

const getRefUser = (() => {
  var _ref3 = _asyncToGenerator(function* () {
    const user = yield knex('webgui_ref').select(['webgui_ref_code.code as code', 'u1.email as sourceUser', 'u2.email as user', 'webgui_ref.time as time']).leftJoin('webgui_ref_code', 'webgui_ref.codeId', 'webgui_ref_code.id').leftJoin('user as u1', 'webgui_ref_code.sourceUserId', 'u1.id').leftJoin('user as u2', 'webgui_ref.userId', 'u2.id').orderBy('webgui_ref.time', 'DESC');
    return user;
  });

  return function getRefUser() {
    return _ref3.apply(this, arguments);
  };
})();

const getRefUserAndPaging = (() => {
  var _ref4 = _asyncToGenerator(function* (opt) {
    const page = opt.page || 1;
    const pageSize = opt.pageSize || 20;
    const invalidId = yield knex('webgui_ref').select(['webgui_ref.id as id']).leftJoin('webgui_ref_code', 'webgui_ref.codeId', 'webgui_ref_code.id').leftJoin('user as u1', 'webgui_ref_code.sourceUserId', 'u1.id').leftJoin('user as u2', 'webgui_ref.userId', 'u2.id').whereNull('u1.id').orWhereNull('u2.id');
    yield knex('webgui_ref').delete().whereIn('id', invalidId.map(function (m) {
      return m.id;
    }));
    let count = knex('webgui_ref').select();
    let user = knex('webgui_ref').select(['webgui_ref.id as id', 'webgui_ref_code.code as code', 'u1.id as sourceUserId', 'u1.email as sourceUser', 'u2.id as userId', 'u2.email as user', 'webgui_ref.time as time']).leftJoin('webgui_ref_code', 'webgui_ref.codeId', 'webgui_ref_code.id').leftJoin('user as u1', 'webgui_ref_code.sourceUserId', 'u1.id').leftJoin('user as u2', 'webgui_ref.userId', 'u2.id').whereNotNull('u1.id').whereNotNull('u2.id');

    count = yield count.count('id as count').then(function (success) {
      return success[0].count;
    });
    user = yield user.orderBy('webgui_ref.time', 'DESC').limit(pageSize).offset((page - 1) * pageSize);
    const maxPage = Math.ceil(count / pageSize);
    return {
      total: count,
      page,
      maxPage,
      pageSize,
      user
    };
  });

  return function getRefUserAndPaging(_x2) {
    return _ref4.apply(this, arguments);
  };
})();

const getOneRefCode = (() => {
  var _ref5 = _asyncToGenerator(function* (id) {
    const code = yield knex('webgui_ref_code').select(['webgui_ref_code.id as id', 'webgui_ref_code.code as code', 'user.email as email', 'webgui_ref_code.visit as visit', 'webgui_ref_code.maxUser as maxUser', knex.raw('count(webgui_ref.codeId) as count')]).leftJoin('webgui_ref', 'webgui_ref_code.id', 'webgui_ref.codeId').leftJoin('user', 'webgui_ref_code.sourceUserId', 'user.id').groupBy('webgui_ref_code.id').where({ 'webgui_ref_code.id': id }).then(function (s) {
      return s[0];
    });
    if (!code) {
      return Promise.reject('refCode not found');
    }
    return code;
  });

  return function getOneRefCode(_x3) {
    return _ref5.apply(this, arguments);
  };
})();

const editOneRefCode = (() => {
  var _ref6 = _asyncToGenerator(function* (id, maxUser) {
    yield knex('webgui_ref_code').update({ maxUser }).where({ 'webgui_ref_code.id': id });
    return 'success';
  });

  return function editOneRefCode(_x4, _x5) {
    return _ref6.apply(this, arguments);
  };
})();

exports.getRefCode = getRefCode;
exports.getOneRefCode = getOneRefCode;
exports.editOneRefCode = editOneRefCode;
exports.getRefUser = getRefUser;
exports.getRefCodeAndPaging = getRefCodeAndPaging;
exports.getRefUserAndPaging = getRefUserAndPaging;