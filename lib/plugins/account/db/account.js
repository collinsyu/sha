'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const tableName = 'account_plugin';

const createTable = (() => {
  var _ref = _asyncToGenerator(function* () {
    const exist = yield knex.schema.hasTable(tableName);
    if (exist) {
      const hasAutoRemoveDelay = yield knex.schema.hasColumn(tableName, 'autoRemoveDelay');
      if (!hasAutoRemoveDelay) {
        yield knex.schema.table(tableName, function (table) {
          table.bigInteger('autoRemoveDelay').defaultTo(0);
        });
      }
      const hasOrderId = yield knex.schema.hasColumn(tableName, 'orderId');
      if (!hasOrderId) {
        yield knex.schema.table(tableName, function (table) {
          table.integer('orderId');
        });
      }
      const results = yield knex(tableName).whereNull('orderId');
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = results[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          const result = _step.value;

          yield knex(tableName).update({ orderId: result.type === 1 ? 0 : result.type }).where({ id: result.id });
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return;
    }
    return knex.schema.createTableIfNotExists(tableName, function (table) {
      table.increments('id');
      table.integer('type');
      table.integer('orderId');
      table.integer('userId');
      table.string('server');
      table.integer('port').unique();
      table.string('password');
      table.string('data');
      table.string('subscribe');
      table.integer('status');
      table.integer('autoRemove').defaultTo(0);
      table.bigInteger('autoRemoveDelay').defaultTo(0);
      table.integer('multiServerFlow').defaultTo(0);
    });
  });

  return function createTable() {
    return _ref.apply(this, arguments);
  };
})();

exports.createTable = createTable;