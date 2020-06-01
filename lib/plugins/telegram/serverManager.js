'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const manager = appRequire('services/manager');

const add = options => {
  const name = options.name,
        host = options.host,
        port = options.port,
        password = options.password;

  return knex('server').insert({
    name,
    host,
    port,
    password
  });
};

const del = id => {
  return knex.transaction(trx => {
    return knex('server').transacting(trx).where({ id }).delete().then(() => knex('saveFlow').transacting(trx).where({ id }).delete()).then(trx.commit).catch(trx.rollback);
  });
};

const edit = options => {
  const id = options.id,
        name = options.name,
        host = options.host,
        port = options.port,
        password = options.password;

  return knex('server').where({ id }).update({
    name,
    host,
    port,
    password
  });
};

const list = (() => {
  var _ref = _asyncToGenerator(function* (options = {}) {
    const serverList = yield knex('server').select(['id', 'name', 'host', 'port', 'password', 'method']).orderBy('name');
    return serverList;
  });

  return function list() {
    return _ref.apply(this, arguments);
  };
})();

exports.add = add;
exports.del = del;
exports.edit = edit;
exports.list = list;