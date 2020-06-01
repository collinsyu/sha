'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const log4js = require('log4js');
const logger = log4js.getLogger('giftcard');
const uuidv4 = require('uuid/v4');
const account = appRequire('plugins/account/index');
const orderPlugin = appRequire('plugins/webgui_order');
const ref = appRequire('plugins/webgui_ref/time');
const moment = require('moment');

const dbTableName = require('./db/giftcard').tableName;

const cardType = {
  hourly: 5,
  daily: 4,
  weekly: 2,
  monthly: 3,
  quarterly: 6,
  yearly: 7
};

const cardStatusEnum = {
  available: 'AVAILABLE',
  used: 'USED',
  revoked: 'REVOKED'
};

const batchStatusEnum = {
  available: 'AVAILABLE',
  usedup: 'USEDUP',
  revoked: 'REVOKED'
};

const generateGiftCard = (() => {
  var _ref = _asyncToGenerator(function* (count, orderType, comment = '') {
    const currentCount = (yield knex(dbTableName).count('* as cnt'))[0].cnt;
    const batchNumber = currentCount === 0 ? 1 : (yield knex(dbTableName).max('batchNumber as mx'))[0].mx + 1;
    const cards = [];
    for (let i = 0; i < count; i++) {
      const password = uuidv4().replace(/\-/g, '').substr(0, 18);
      cards.push({
        orderType,
        status: cardStatusEnum.available,
        batchNumber,
        password,
        createTime: Date.now(),
        comment
      });
    }
    yield knex(dbTableName).insert(cards);
    logger.debug(`Inserted ${count} gift card`);
    return batchNumber;
  });

  return function generateGiftCard(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const sendSuccessMail = (() => {
  var _ref2 = _asyncToGenerator(function* (userId) {
    const emailPlugin = appRequire('plugins/email/index');
    const user = yield knex('user').select().where({
      type: 'normal',
      id: userId
    }).then(function (success) {
      if (success.length) {
        return success[0];
      }
      return Promise.reject('user not found');
    });
    const orderMail = yield knex('webguiSetting').select().where({
      key: 'mail'
    }).then(function (success) {
      if (!success.length) {
        return Promise.reject('settings not found');
      }
      success[0].value = JSON.parse(success[0].value);
      return success[0].value.order;
    });
    yield emailPlugin.sendMail(user.email, orderMail.title, orderMail.content);
  });

  return function sendSuccessMail(_x3) {
    return _ref2.apply(this, arguments);
  };
})();

const processOrder = (() => {
  var _ref3 = _asyncToGenerator(function* (userId, accountId, password) {
    const cardResult = yield knex(dbTableName).where({ password }).select();
    if (cardResult.length === 0) {
      return { success: false, message: '充值码不存在' };
    }
    const card = cardResult[0];
    if (card.status !== cardStatusEnum.available) {
      return { success: false, message: '无法使用这个充值码' };
    }
    yield knex(dbTableName).where({ id: card.id }).update({
      user: userId,
      account: accountId,
      status: cardStatusEnum.used,
      usedTime: Date.now()
    });
    const orderInfo = yield orderPlugin.getOneOrder(card.orderType);
    yield account.setAccountLimit(userId, accountId, card.orderType);
    yield ref.payWithRef(userId, card.orderType);
    // if(card.orderType <= 7) {
    //   await account.setAccountLimit(userId, accountId, card.orderType);
    //   await ref.payWithRef(userId, card.orderType);
    // } else {
    //   if(card.orderType === 8) {
    //     await account.addAccountTime(userId, accountId, 2, 2);
    //   }
    //   if(card.orderType === 9) {
    //     await account.addAccountTime(userId, accountId, 3, 6);
    //   }
    // }
    return { success: true, type: card.orderType, cardId: card.id };
  });

  return function processOrder(_x4, _x5, _x6) {
    return _ref3.apply(this, arguments);
  };
})();

const orderListAndPaging = (() => {
  var _ref4 = _asyncToGenerator(function* (options = {}) {
    const search = options.search || '';
    const filter = options.filter || [];
    const group = options.group;
    const sort = options.sort || `${dbTableName}.createTime_desc`;
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = options.start ? moment(options.start).hour(0).minute(0).second(0).millisecond(0).toDate().getTime() : moment(0).toDate().getTime();
    const end = options.end ? moment(options.end).hour(23).minute(59).second(59).millisecond(999).toDate().getTime() : moment().toDate().getTime();

    const where = {};
    where[dbTableName + '.status'] = cardStatusEnum.used;
    let count = knex(dbTableName).select([]).where(where).whereBetween(`${dbTableName}.usedTime`, [start, end]);
    let orders = knex(dbTableName).select([`${dbTableName}.password as orderId`, `${dbTableName}.orderType`, 'user.id as userId', 'user.username', 'account_plugin.port', `${dbTableName}.status`, `${dbTableName}.usedTime as createTime`]).where(where).orderBy(`${dbTableName}.usedTime`, 'DESC').leftJoin('user', 'user.id', `${dbTableName}.user`).leftJoin('account_plugin', 'account_plugin.id', `${dbTableName}.account`).whereBetween(`${dbTableName}.usedTime`, [start, end]);

    if (filter.length) {
      count = count.whereIn(`${dbTableName}.status`, filter);
      orders = orders.whereIn(`${dbTableName}.status`, filter);
    }
    if (group >= 0) {
      count = count.leftJoin('user', 'user.id', `${dbTableName}.user`).where({ 'user.group': group });
      orders = orders.where({ 'user.group': group });
    }
    if (search) {
      count = count.where(`${dbTableName}.password`, 'like', `%${search}%`);
      orders = orders.where(`${dbTableName}.password`, 'like', `%${search}%`);
    }

    count = yield count.count(`${dbTableName}.id as count`).then(function (success) {
      return success[0].count;
    });
    orders = yield orders.orderBy(sort.split('_')[0], sort.split('_')[1]).limit(pageSize).offset((page - 1) * pageSize);
    const maxPage = Math.ceil(count / pageSize);
    return {
      total: count,
      page,
      maxPage,
      pageSize,
      orders
    };
  });

  return function orderListAndPaging() {
    return _ref4.apply(this, arguments);
  };
})();

const checkOrder = (() => {
  var _ref5 = _asyncToGenerator(function* (id) {
    const order = yield knex(dbTableName).select().where({ id });
    if (order.length > 0) {
      return success[0].status;
    } else {
      return null;
    }
  });

  return function checkOrder(_x7) {
    return _ref5.apply(this, arguments);
  };
})();

const generateBatchInfo = x => {
  let status;
  if (x.status === cardStatusEnum.revoked) status = batchStatusEnum.revoked;else {
    if (x.availableCount > 0) status = batchStatusEnum.available;else status = batchStatusEnum.usedup;
  }
  return {
    orderName: x.orderName,
    batchNumber: x.batchNumber,
    status: status,
    type: x.orderType,
    createTime: x.createTime,
    comment: x.comment,
    totalCount: x.totalCount,
    availableCount: x.availableCount
  };
};

const listBatch = (() => {
  var _ref6 = _asyncToGenerator(function* () {
    const sqlResult = yield knex(dbTableName).select(['webgui_order.name as orderName', `${dbTableName}.batchNumber`, `${dbTableName}.status as status`, `${dbTableName}.orderType as orderType`, `${dbTableName}.createTime as createTime`, `${dbTableName}.comment as comment`, knex.raw('COUNT(*) as totalCount'), knex.raw(`COUNT(case status when '${cardStatusEnum.available}' then 1 else null end) as availableCount`)]).groupBy('batchNumber').leftJoin('webgui_order', `${dbTableName}.orderType`, 'webgui_order.id');
    const finalResult = sqlResult.map(generateBatchInfo);
    return finalResult;
  });

  return function listBatch() {
    return _ref6.apply(this, arguments);
  };
})();

const getBatchDetails = (() => {
  var _ref7 = _asyncToGenerator(function* (batchNumber) {
    const sqlBatchResult = yield knex(dbTableName).select(['webgui_order.name as orderName', `${dbTableName}.batchNumber`, `${dbTableName}.status as status`, `${dbTableName}.orderType as orderType`, `${dbTableName}.createTime as createTime`, `${dbTableName}.comment as comment`, knex.raw('COUNT(*) as totalCount'), knex.raw(`COUNT(case status when '${cardStatusEnum.available}' then 1 else null end) as availableCount`)]).where({ batchNumber }).leftJoin('webgui_order', `${dbTableName}.orderType`, 'webgui_order.id');
    if (sqlBatchResult.length == 0) {
      return null;
    }

    const batchInfo = generateBatchInfo(sqlBatchResult[0]);

    const sqlCardsResult = yield knex(dbTableName).select([`${dbTableName}.id as id`, `${dbTableName}.status as status`, `${dbTableName}.usedTime as usedTime`, `${dbTableName}.password as password`, 'account_plugin.port as portNumber', 'user.email as userEmail']).where({ batchNumber: batchNumber }).leftJoin('account_plugin', `${dbTableName}.account`, 'account_plugin.id').leftJoin('user', `${dbTableName}.user`, 'user.id');

    return Object.assign(batchInfo, { cards: sqlCardsResult });
  });

  return function getBatchDetails(_x8) {
    return _ref7.apply(this, arguments);
  };
})();

const revokeBatch = (() => {
  var _ref8 = _asyncToGenerator(function* (batchNumber) {
    yield knex(dbTableName).where({
      batchNumber,
      status: cardStatusEnum.available
    }).update({ status: cardStatusEnum.revoked });
  });

  return function revokeBatch(_x9) {
    return _ref8.apply(this, arguments);
  };
})();

const getUserOrders = (() => {
  var _ref9 = _asyncToGenerator(function* (userId) {
    const orders = yield knex(dbTableName).select([`${dbTableName}.password as orderId`, `${dbTableName}.orderType`, 'user.id as userId', 'user.username', 'account_plugin.port', `${dbTableName}.status`, `${dbTableName}.usedTime as createTime`]).where({ 'user.id': userId }).orderBy(`${dbTableName}.usedTime`, 'DESC').leftJoin('user', 'user.id', `${dbTableName}.user`).leftJoin('account_plugin', 'account_plugin.id', `${dbTableName}.account`);
    return orders;
  });

  return function getUserOrders(_x10) {
    return _ref9.apply(this, arguments);
  };
})();

exports.generateGiftCard = generateGiftCard;
exports.orderListAndPaging = orderListAndPaging;
exports.checkOrder = checkOrder;
exports.processOrder = processOrder;
exports.revokeBatch = revokeBatch;
exports.listBatch = listBatch;
exports.getBatchDetails = getBatchDetails;
exports.getUserOrders = getUserOrders;