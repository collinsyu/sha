'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const tableName = 'group';

const addDefaultGroup = (() => {
  var _ref = _asyncToGenerator(function* () {
    const data = yield knex('group').where({ id: 0 }).then(function (s) {
      return s[0];
    });
    if (!data) {
      const id = yield knex('group').returning('id').insert({ id: 0, name: '默认组', comment: '系统默认分组' });
      if (id[0] !== 0) {
        yield knex('group').update({ id: 0 }).where({ id: id[0] });
      }
    }
    return;
  });

  return function addDefaultGroup() {
    return _ref.apply(this, arguments);
  };
})();

const createTable = (() => {
  var _ref2 = _asyncToGenerator(function* () {
    const exist = yield knex.schema.hasTable(tableName);
    if (exist) {
      yield addDefaultGroup();
      const hasShowNotice = yield knex.schema.hasColumn(tableName, 'showNotice');
      if (!hasShowNotice) {
        yield knex.schema.table(tableName, function (table) {
          table.integer('showNotice').defaultTo(1);
        });
      }
      const hasOrder = yield knex.schema.hasColumn(tableName, 'order');
      if (!hasOrder) {
        yield knex.schema.table(tableName, function (table) {
          table.string('order');
        });
      }
      const hasMultiAccount = yield knex.schema.hasColumn(tableName, 'multiAccount');
      if (!hasMultiAccount) {
        yield knex.schema.table(tableName, function (table) {
          table.integer('multiAccount').defaultTo(0);
        });
      }
      return;
    }
    yield knex.schema.createTableIfNotExists(tableName, function (table) {
      table.increments('id');
      table.string('name');
      table.string('comment');
      table.integer('showNotice').defaultTo(1);
      table.string('order');
      table.integer('multiAccount').defaultTo(0);
    });
    yield addDefaultGroup();
    return;
  });

  return function createTable() {
    return _ref2.apply(this, arguments);
  };
})();

exports.createTable = createTable;