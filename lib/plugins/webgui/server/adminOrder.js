'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const orderPlugin = appRequire('plugins/webgui_order');
const accountPlugin = appRequire('plugins/account');

exports.getOrders = (() => {
  var _ref = _asyncToGenerator(function* (req, res) {
    try {
      const orders = yield orderPlugin.getOrdersAndAccountNumber();
      res.send(orders);
    } catch (err) {
      console.log(err);
      res.status(403).end();
    }
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

exports.getOneOrder = (() => {
  var _ref2 = _asyncToGenerator(function* (req, res) {
    try {
      const orderId = +req.params.orderId;
      const order = yield orderPlugin.getOneOrder(orderId);
      res.send(order);
    } catch (err) {
      console.log(err);
      res.status(403).end();
    }
  });

  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
})();

exports.newOrder = (() => {
  var _ref3 = _asyncToGenerator(function* (req, res) {
    try {
      const data = {};
      data.baseId = req.body.baseId || 0;
      data.name = req.body.name;
      data.shortComment = req.body.shortComment;
      data.comment = req.body.comment;
      data.type = req.body.type;
      data.cycle = req.body.cycle;
      data.alipay = req.body.alipay;
      data.paypal = req.body.paypal;
      data.flow = req.body.flow;
      data.refTime = req.body.refTime;
      data.server = req.body.server;
      data.autoRemove = req.body.autoRemove;
      data.autoRemoveDelay = req.body.autoRemoveDelay;
      data.portRange = req.body.portRange;
      data.multiServerFlow = req.body.multiServerFlow;
      data.changeOrderType = req.body.changeOrderType;
      yield orderPlugin.newOrder(data);
      res.send('success');
    } catch (err) {
      console.log(err);
      res.status(403).end();
    }
  });

  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
})();

exports.editOrder = (() => {
  var _ref4 = _asyncToGenerator(function* (req, res) {
    try {
      const data = {};
      data.baseId = +req.body.baseId || 0;
      data.id = +req.params.orderId;
      data.name = req.body.name;
      data.shortComment = req.body.shortComment;
      data.comment = req.body.comment;
      data.type = req.body.type;
      data.cycle = req.body.cycle;
      data.alipay = req.body.alipay;
      data.paypal = req.body.paypal;
      data.flow = req.body.flow;
      data.refTime = req.body.refTime;
      data.server = req.body.server;
      data.autoRemove = req.body.autoRemove;
      data.autoRemoveDelay = req.body.autoRemoveDelay;
      data.portRange = req.body.portRange;
      data.multiServerFlow = req.body.multiServerFlow;
      data.changeOrderType = req.body.changeOrderType;
      yield orderPlugin.editOrder(data);
      const changeCurrentAccount = req.body.changeCurrentAccount;
      const update = {};
      if (changeCurrentAccount.flow) {
        update.flow = data.flow;
      }
      if (changeCurrentAccount.server) {
        update.server = data.server;
      }
      if (changeCurrentAccount.autoRemove) {
        update.autoRemove = data.autoRemove;
      }
      accountPlugin.editMultiAccounts(data.id, update);
      res.send('success');
    } catch (err) {
      console.log(err);
      res.status(403).end();
    }
  });

  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
})();

exports.deleteOrder = (() => {
  var _ref5 = _asyncToGenerator(function* (req, res) {
    try {
      const orderId = +req.params.orderId;
      yield orderPlugin.deleteOrder(orderId);
      res.send('success');
    } catch (err) {
      console.log(err);
      const errorData = ['account with this order exists', 'giftcard with this order exists'];
      if (errorData.indexOf(err) < 0) {
        return res.status(403).end();
      } else {
        return res.status(403).end(err);
      }
    }
  });

  return function (_x9, _x10) {
    return _ref5.apply(this, arguments);
  };
})();