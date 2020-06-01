'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const config = appRequire('services/config').all();

const getOrders = (() => {
  var _ref = _asyncToGenerator(function* () {
    return knex('webgui_order').where({});
  });

  return function getOrders() {
    return _ref.apply(this, arguments);
  };
})();

const getOrdersAndAccountNumber = (() => {
  var _ref2 = _asyncToGenerator(function* () {
    const orders = yield knex('webgui_order').select(['webgui_order.id as id', 'webgui_order.baseId as baseId', 'webgui_order.name as name', 'webgui_order.shortComment as shortComment', 'webgui_order.comment as comment', 'webgui_order.type as type', 'webgui_order.cycle as cycle', 'webgui_order.alipay as alipay', 'webgui_order.paypal as paypal', 'webgui_order.flow as flow', 'webgui_order.refTime as refTime', 'webgui_order.server as server', 'webgui_order.autoRemove as autoRemove', 'webgui_order.autoRemoveDelay as autoRemoveDelay', 'webgui_order.portRange as portRange', 'webgui_order.multiServerFlow as multiServerFlow', 'webgui_order.changeOrderType as changeOrderType', 'webgui_order.autoRemove as autoRemove', knex.raw('count(account_plugin.id) as accountNumber')]).leftJoin('account_plugin', 'account_plugin.orderId', 'webgui_order.id').groupBy('webgui_order.id');
    return orders;
  });

  return function getOrdersAndAccountNumber() {
    return _ref2.apply(this, arguments);
  };
})();

const getOneOrder = (() => {
  var _ref3 = _asyncToGenerator(function* (orderId) {
    const order = yield knex('webgui_order').where({ id: orderId }).then(function (s) {
      return s[0];
    });
    if (!order) {
      return Promise.reject('order not found');
    }
    return order;
  });

  return function getOneOrder(_x) {
    return _ref3.apply(this, arguments);
  };
})();

const getOneOrderByAccountId = (() => {
  var _ref4 = _asyncToGenerator(function* (accountId) {
    const order = yield knex('webgui_order').select(['webgui_order.id as id', 'webgui_order.changeOrderType as changeOrderType']).leftJoin('account_plugin', 'account_plugin.orderId', 'webgui_order.id').where({ 'account_plugin.id': accountId }).then(function (s) {
      return s[0];
    });
    return order;
  });

  return function getOneOrderByAccountId(_x2) {
    return _ref4.apply(this, arguments);
  };
})();

const newOrder = (() => {
  var _ref5 = _asyncToGenerator(function* (data) {
    yield knex('webgui_order').insert({
      baseId: data.baseId,
      name: data.name,
      shortComment: data.shortComment,
      comment: data.comment,
      type: data.type,
      cycle: data.cycle,
      alipay: data.alipay,
      paypal: data.paypal,
      flow: data.flow,
      refTime: data.refTime,
      server: data.server ? JSON.stringify(data.server) : null,
      autoRemove: data.autoRemove,
      autoRemoveDelay: data.autoRemoveDelay,
      portRange: data.portRange,
      multiServerFlow: data.multiServerFlow,
      changeOrderType: data.changeOrderType
    });
    return;
  });

  return function newOrder(_x3) {
    return _ref5.apply(this, arguments);
  };
})();

const editOrder = (() => {
  var _ref6 = _asyncToGenerator(function* (data) {
    yield knex('webgui_order').update({
      baseId: data.baseId,
      name: data.name,
      shortComment: data.shortComment,
      comment: data.comment,
      type: data.type,
      cycle: data.cycle,
      alipay: data.alipay,
      paypal: data.paypal,
      flow: data.flow,
      refTime: data.refTime,
      server: data.server ? JSON.stringify(data.server) : null,
      autoRemove: data.autoRemove,
      autoRemoveDelay: data.autoRemoveDelay,
      portRange: data.portRange,
      multiServerFlow: data.multiServerFlow,
      changeOrderType: data.changeOrderType
    }).where({
      id: data.id
    });
    return;
  });

  return function editOrder(_x4) {
    return _ref6.apply(this, arguments);
  };
})();

const deleteOrder = (() => {
  var _ref7 = _asyncToGenerator(function* (orderId) {
    const hasAccount = yield knex('account_plugin').where({ orderId });
    if (hasAccount.length) {
      return Promise.reject('account with this order exists');
    }
    const isGiftCardOn = config.plugins.giftcard && config.plugins.giftcard.use;
    const hasGiftcard = isGiftCardOn ? yield knex('giftcard').where({ orderType: orderId, status: 'AVAILABLE' }) : [];
    if (hasGiftcard.length) {
      return Promise.reject('giftcard with this order exists');
    }
    yield knex('webgui_order').delete().where({ id: orderId });
    return;
  });

  return function deleteOrder(_x5) {
    return _ref7.apply(this, arguments);
  };
})();

exports.getOrders = getOrders;
exports.getOrdersAndAccountNumber = getOrdersAndAccountNumber;
exports.getOneOrder = getOneOrder;
exports.newOrder = newOrder;
exports.editOrder = editOrder;
exports.deleteOrder = deleteOrder;
exports.getOneOrderByAccountId = getOneOrderByAccountId;