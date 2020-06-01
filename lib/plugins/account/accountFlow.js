'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const manager = appRequire('services/manager');

const add = (() => {
  var _ref = _asyncToGenerator(function* (accountId) {
    const servers = yield knex('server').select();
    const accountInfo = yield knex('account_plugin').where({ id: accountId }).then(function (s) {
      return s[0];
    });
    const addAccountFlow = (() => {
      var _ref2 = _asyncToGenerator(function* (server, accountId) {
        const accountFlowInfo = yield knex('account_flow').where({ serverId: server.id, accountId }).then(function (s) {
          return s[0];
        });
        if (accountFlowInfo) {
          return;
        }
        yield knex('account_flow').insert({
          serverId: server.id,
          accountId,
          port: accountInfo.port + server.shift,
          nextCheckTime: Date.now()
        });
      });

      return function addAccountFlow(_x2, _x3) {
        return _ref2.apply(this, arguments);
      };
    })();
    yield Promise.all(servers.map(function (server) {
      return addAccountFlow(server, accountId);
    }));
    return;
  });

  return function add(_x) {
    return _ref.apply(this, arguments);
  };
})();

const del = (() => {
  var _ref3 = _asyncToGenerator(function* (accountId) {
    yield knex('account_flow').delete().where({ accountId });
    return;
  });

  return function del(_x4) {
    return _ref3.apply(this, arguments);
  };
})();

const pwd = (() => {
  var _ref4 = _asyncToGenerator(function* (accountId, password) {
    const servers = yield knex('server').select();
    let accountServers = servers;
    const accountInfo = yield knex('account_plugin').where({ id: accountId }).then(function (s) {
      return s[0];
    });
    if (accountInfo.server) {
      accountServers = servers.filter(function (f) {
        return JSON.parse(accountInfo.server).indexOf(f.id) >= 0;
      });
    }
    accountServers.forEach(function (server) {
      manager.send({
        command: 'pwd',
        port: accountInfo.port + server.shift,
        password
      }, {
        host: server.host,
        port: server.port,
        password: server.password
      });
    });
  });

  return function pwd(_x5, _x6) {
    return _ref4.apply(this, arguments);
  };
})();

const edit = (() => {
  var _ref5 = _asyncToGenerator(function* (accountId) {
    const servers = yield knex('server').select();
    const accountInfo = yield knex('account_plugin').where({ id: accountId }).then(function (s) {
      return s[0];
    });
    yield Promise.all(servers.map(function (server) {
      return knex('account_flow').update({
        port: accountInfo.port + server.shift,
        nextCheckTime: Date.now()
      }).where({
        serverId: server.id,
        accountId
      });
    }));
    return;
  });

  return function edit(_x7) {
    return _ref5.apply(this, arguments);
  };
})();

const server = (() => {
  var _ref6 = _asyncToGenerator(function* (serverId) {
    const server = yield knex('server').where({ id: serverId }).then(function (s) {
      return s[0];
    });
    const accounts = yield knex('account_plugin').where({});
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = accounts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        const account = _step.value;

        const exists = yield knex('account_flow').where({
          serverId,
          accountId: account.id
        }).then(function (s) {
          return s[0];
        });
        if (!exists) {
          yield knex('account_flow').insert({
            serverId: server.id,
            accountId: account.id,
            port: account.port + server.shift,
            nextCheckTime: Date.now()
          });
        } else {
          yield knex('account_flow').update({
            port: account.port + server.shift,
            nextCheckTime: Date.now()
          }).where({
            serverId: server.id,
            accountId: account.id
          });
        }
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
  });

  return function server(_x8) {
    return _ref6.apply(this, arguments);
  };
})();

exports.add = add;
exports.del = del;
exports.pwd = pwd;
exports.edit = edit;
exports.addServer = server;
exports.editServer = server;