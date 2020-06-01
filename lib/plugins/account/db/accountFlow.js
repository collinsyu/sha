'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const tableName = 'account_flow';

const createTable = (() => {
  var _ref = _asyncToGenerator(function* () {
    const exist = yield knex.schema.hasTable(tableName);
    if (exist) {
      const hasStatus = yield knex.schema.hasColumn(tableName, 'status');
      if (!hasStatus) {
        yield knex.schema.table(tableName, function (table) {
          table.string('status').defaultTo('checked');
        });
      }
      const hasAutobanTime = yield knex.schema.hasColumn(tableName, 'autobanTime');
      if (!hasAutobanTime) {
        yield knex.schema.table(tableName, function (table) {
          table.bigInteger('autobanTime');
        });
      }
      return;
    }
    return knex.schema.createTableIfNotExists(tableName, function (table) {
      table.increments('id');
      table.integer('serverId');
      table.integer('accountId');
      table.integer('port');
      table.bigInteger('updateTime');
      table.bigInteger('checkTime');
      table.bigInteger('nextCheckTime');
      table.bigInteger('autobanTime');
      table.bigInteger('flow').defaultTo(0);
      table.string('status').defaultTo('checked');
    });
  });

  return function createTable() {
    return _ref.apply(this, arguments);
  };
})();

exports.createTable = createTable;