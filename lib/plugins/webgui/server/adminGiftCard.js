'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const giftcard = appRequire('plugins/giftcard');
const log4js = require('log4js');
const logger = log4js.getLogger('webgui');

exports.addGiftCard = (() => {
  var _ref = _asyncToGenerator(function* (req, resp) {
    const count = Number(req.body.count);
    const orderId = Number(req.body.orderId);
    const comment = req.body.comment;
    if (count === NaN || orderId === NaN || count === 0) {
      resp.status(400).send('Bad parameters').end();
      return;
    }
    try {
      const batchNumber = yield giftcard.generateGiftCard(count, orderId, comment);
      resp.send({ batchNumber: batchNumber });
    } catch (err) {
      logger.error(`添加充值码失败：${err.toString()}`);
      resp.status(500).send(err.toString()).end();
    }
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

exports.revokeBatch = (() => {
  var _ref2 = _asyncToGenerator(function* (req, resp) {
    const batchNumber = Number(req.body.batchNumber);
    if (req.body.batchNumber != null && batchNumber !== NaN) {
      try {
        yield giftcard.revokeBatch(batchNumber);
        resp.send('success');
      } catch (err) {
        logger.error(`无法收回批次 ${batchNumber}：${err.toString()}`);
        resp.status(500).end();
      }
    } else {
      resp.status(400).end();
    }
  });

  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
})();

exports.listBatch = (() => {
  var _ref3 = _asyncToGenerator(function* (req, res) {
    try {
      res.send((yield giftcard.listBatch()));
    } catch (err) {
      logger.error(`无法列出充值码：${err.toString()}`);
      res.status(500).end();
    }
  });

  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
})();

exports.getBatchDetails = (() => {
  var _ref4 = _asyncToGenerator(function* (req, resp) {
    const batchNumber = Number(req.params.batchNumber);
    if (req.params.batchNumber != null && batchNumber !== NaN) {
      try {
        const details = yield giftcard.getBatchDetails(batchNumber);
        if (details != null) resp.send(details);else resp.send(404).end();
      } catch (err) {
        logger.error(`无法查询批次 ${batchNumber}：${err.toString()}`);
        resp.status(500).end();
      }
    } else {
      resp.status(400).end();
    }
  });

  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
})();

exports.getOrders = (() => {
  var _ref5 = _asyncToGenerator(function* (req, res) {
    try {
      const options = {};
      if (req.adminInfo.id === 1) {
        options.group = +req.query.group;
      } else {
        options.group = req.adminInfo.group;
      }
      options.page = +req.query.page;
      options.pageSize = +req.query.pageSize;
      options.start = req.query.start;
      options.end = req.query.end;
      const details = yield giftcard.orderListAndPaging(options);
      res.send(details);
    } catch (err) {
      logger.error(err);
      res.status(500).end();
    }
  });

  return function (_x9, _x10) {
    return _ref5.apply(this, arguments);
  };
})();

exports.getUserOrders = (() => {
  var _ref6 = _asyncToGenerator(function* (req, res) {
    try {
      const userId = +req.params.userId;
      const details = yield giftcard.getUserOrders(userId);
      res.send(details);
    } catch (err) {
      logger.error(err);
      res.status(500).end();
    }
  });

  return function (_x11, _x12) {
    return _ref6.apply(this, arguments);
  };
})();

exports.useGiftCardForUser = (() => {
  var _ref7 = _asyncToGenerator(function* (req, res) {
    try {
      const password = req.body.password;
      const userId = +req.body.userId;
      const accountId = req.body.accountId ? +req.body.accountId : null;
      const result = yield giftcard.processOrder(userId, accountId, password);
      res.send(result);
    } catch (err) {
      logger.error(err);
      res.status(500).end();
    }
  });

  return function (_x13, _x14) {
    return _ref7.apply(this, arguments);
  };
})();