'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const account = appRequire('plugins/account/index');

const getFlowPack = (() => {
  var _ref = _asyncToGenerator(function* (accountId, start, end) {
    const flowPacks = yield knex('webgui_flow_pack').where({ accountId }).whereBetween('createTime', [start, end]);
    if (!flowPacks.length) {
      return 0;
    }
    return flowPacks.reduce(function (a, b) {
      return { flow: a.flow + b.flow };
    }, { flow: 0 }).flow;
  });

  return function getFlowPack(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
})();

exports.getFlowPack = getFlowPack;