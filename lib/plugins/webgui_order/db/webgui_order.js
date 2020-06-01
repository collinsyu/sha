'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const tableName = 'webgui_order';

const addDefaultOrder = (() => {
  var _ref = _asyncToGenerator(function* () {
    const data = yield knex('webgui_order').where({}).then(function (s) {
      return s[0];
    });
    if (!data) {
      const oldData = yield knex('webguiSetting').where({ key: 'payment' }).then(function (s) {
        return JSON.parse(s[0].value);
      });
      const types = {
        2: 'week',
        3: 'month',
        4: 'day',
        5: 'hour',
        6: 'season',
        7: 'year'
      };
      const insertData = [];
      for (const type in types) {
        let cycle = 1;
        if (+type === 6) {
          cycle = 3;
        }
        if (+type === 7) {
          cycle = 12;
        }
        insertData.push({
          id: type,
          name: oldData[types[type]].orderName || types[type],
          type: type <= 5 ? type : 3,
          cycle,
          alipay: oldData[types[type]].alipay || 99,
          paypal: oldData[types[type]].paypal || 99,
          autoRemove: oldData[types[type]].autoRemove ? 1 : 0,
          multiServerFlow: oldData[types[type]].multiServerFlow ? 1 : 0,
          changeOrderType: 1,
          flow: oldData[types[type]].flow * 1000 * 1000 || 1000 * 1000 * 1000,
          server: oldData[types[type]].server ? JSON.stringify(oldData[types[type]].server) : null,
          refTime: 0
        });
      }
      yield knex(tableName).insert(insertData);
    }
    return;
  });

  return function addDefaultOrder() {
    return _ref.apply(this, arguments);
  };
})();

const fixRefTime = (() => {
  var _ref2 = _asyncToGenerator(function* () {
    yield knex.schema.alterTable(tableName, function (table) {
      table.bigInteger('refTime').alter();
    });
  });

  return function fixRefTime() {
    return _ref2.apply(this, arguments);
  };
})();

const createTable = (() => {
  var _ref3 = _asyncToGenerator(function* () {
    const exist = yield knex.schema.hasTable(tableName);
    if (exist) {
      const hasAutoRemoveDelay = yield knex.schema.hasColumn(tableName, 'autoRemoveDelay');
      if (!hasAutoRemoveDelay) {
        yield knex.schema.table(tableName, function (table) {
          table.bigInteger('autoRemoveDelay').defaultTo(0);
        });
      }
      const hasPortRange = yield knex.schema.hasColumn(tableName, 'portRange');
      if (!hasPortRange) {
        yield knex.schema.table(tableName, function (table) {
          table.string('portRange').defaultTo('0');
        });
      }
      const hasShortComment = yield knex.schema.hasColumn(tableName, 'shortComment');
      if (!hasShortComment) {
        yield knex.schema.table(tableName, function (table) {
          table.string('shortComment').defaultTo('');
        });
      }
      const hasBaseId = yield knex.schema.hasColumn(tableName, 'baseId');
      if (!hasBaseId) {
        yield knex.schema.table(tableName, function (table) {
          table.integer('baseId').defaultTo(0);
        });
      }
      yield addDefaultOrder();
      yield fixRefTime();
      return;
    }
    yield knex.schema.createTableIfNotExists(tableName, function (table) {
      table.increments('id').primary();
      table.integer('baseId').defaultTo(0);
      table.string('name');
      table.string('shortComment').defaultTo('');
      table.string('comment', 16384).defaultTo('');
      table.integer('type');
      table.integer('cycle');
      table.float('alipay');
      table.float('paypal');
      table.bigInteger('flow');
      table.bigInteger('refTime');
      table.string('server');
      table.integer('autoRemove').defaultTo(0);
      table.bigInteger('autoRemoveDelay').defaultTo(0);
      table.string('portRange').defaultTo('0');
      table.integer('multiServerFlow').defaultTo(0);
      table.integer('changeOrderType').defaultTo(0);
    });
    yield addDefaultOrder();
    return;
  });

  return function createTable() {
    return _ref3.apply(this, arguments);
  };
})();

exports.createTable = createTable;