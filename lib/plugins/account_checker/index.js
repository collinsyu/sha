'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const log4js = require('log4js');
const logger = log4js.getLogger('account');
const knex = appRequire('init/knex').knex;
const flow = appRequire('plugins/flowSaver/flow');
const manager = appRequire('services/manager');
const config = appRequire('services/config').all();
const sleepTime = 100;
const accountFlow = appRequire('plugins/account/accountFlow');

const sleep = time => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
};

const randomInt = max => {
  return Math.ceil(Math.random() * max % max);
};

const modifyAccountFlow = (() => {
  var _ref = _asyncToGenerator(function* (serverId, accountId, time) {
    yield knex('account_flow').update({
      checkTime: Date.now(),
      nextCheckTime: Date.now() + time
    }).where({ serverId, accountId });
  });

  return function modifyAccountFlow(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
})();

const isPortExists = (() => {
  var _ref2 = _asyncToGenerator(function* (server, account) {
    const ports = (yield manager.send({ command: 'list' }, {
      host: server.host,
      port: server.port,
      password: server.password
    })).map(function (m) {
      return m.port;
    });
    if (ports.indexOf(server.shift + account.port) >= 0) {
      return true;
    } else {
      return false;
    }
  });

  return function isPortExists(_x4, _x5) {
    return _ref2.apply(this, arguments);
  };
})();

const hasServer = (server, account) => {
  if (!account.server) {
    return true;
  }
  const serverList = JSON.parse(account.server);
  if (serverList.indexOf(server.id) >= 0) {
    return true;
  }
  return false;
};

const isExpired = (server, account) => {
  if (account.type >= 2 && account.type <= 5) {
    let timePeriod = 0;
    if (account.type === 2) {
      timePeriod = 7 * 86400 * 1000;
    }
    if (account.type === 3) {
      timePeriod = 30 * 86400 * 1000;
    }
    if (account.type === 4) {
      timePeriod = 1 * 86400 * 1000;
    }
    if (account.type === 5) {
      timePeriod = 3600 * 1000;
    }
    const data = JSON.parse(account.data);
    const expireTime = data.create + data.limit * timePeriod;
    account.expireTime = expireTime;
    if (expireTime <= Date.now() || data.create >= Date.now()) {
      const nextCheckTime = 10 * 60 * 1000 + randomInt(30000);
      if (account.autoRemove && expireTime + account.autoRemoveDelay < Date.now()) {
        modifyAccountFlow(server.id, account.id, nextCheckTime > account.autoRemoveDelay ? account.autoRemoveDelay : nextCheckTime);
        knex('account_plugin').delete().where({ id: account.id }).then();
      } else {
        modifyAccountFlow(server.id, account.id, nextCheckTime);
      }
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const isBaned = (() => {
  var _ref3 = _asyncToGenerator(function* (server, account) {
    const accountFlowInfo = yield knex('account_flow').where({
      serverId: server.id,
      accountId: account.id,
      status: 'ban'
    }).then(function (s) {
      return s[0];
    });
    if (!accountFlowInfo) {
      return false;
    }
    if (!accountFlowInfo.autobanTime || Date.now() > accountFlowInfo.autobanTime) {
      yield knex('account_flow').update({ status: 'checked' }).where({ id: accountFlowInfo.id });
      return false;
    }
    yield knex('account_flow').update({ nextCheckTime: accountFlowInfo.autobanTime }).where({ id: accountFlowInfo.id });
    return true;
  });

  return function isBaned(_x6, _x7) {
    return _ref3.apply(this, arguments);
  };
})();

const isOverFlow = (() => {
  var _ref4 = _asyncToGenerator(function* (server, account) {
    let realFlow = 0;
    const writeFlow = (() => {
      var _ref5 = _asyncToGenerator(function* (serverId, accountId, flow, time) {
        const exists = yield knex('account_flow').where({ serverId, accountId }).then(function (s) {
          return s[0];
        });
        if (exists) {
          yield knex('account_flow').update({
            flow,
            checkTime: Date.now(),
            nextCheckTime: Date.now() + Math.ceil(time)
          }).where({ id: exists.id });
        }
      });

      return function writeFlow(_x10, _x11, _x12, _x13) {
        return _ref5.apply(this, arguments);
      };
    })();
    if (account.type >= 2 && account.type <= 5) {
      let timePeriod = 0;
      if (account.type === 2) {
        timePeriod = 7 * 86400 * 1000;
      }
      if (account.type === 3) {
        timePeriod = 30 * 86400 * 1000;
      }
      if (account.type === 4) {
        timePeriod = 1 * 86400 * 1000;
      }
      if (account.type === 5) {
        timePeriod = 3600 * 1000;
      }
      const data = JSON.parse(account.data);
      let startTime = data.create;
      while (startTime + timePeriod <= Date.now()) {
        startTime += timePeriod;
      }
      const endTime = Date.now();

      const isMultiServerFlow = !!account.multiServerFlow;

      let servers = [];
      if (isMultiServerFlow) {
        servers = yield knex('server').where({});
      } else {
        servers = yield knex('server').where({ id: server.id });
      }

      const flows = yield flow.getFlowFromSplitTimeWithScale(servers.map(function (m) {
        return m.id;
      }), account.id, startTime, endTime);

      const serverObj = {};
      servers.forEach(function (server) {
        serverObj[server.id] = server;
      });
      flows.forEach(function (flo) {
        flo.forEach(function (f) {
          if (serverObj[f.id]) {
            if (!serverObj[f.id].flow) {
              serverObj[f.id].flow = f.sumFlow;
            } else {
              serverObj[f.id].flow += f.sumFlow;
            }
          }
        });
      });
      let sumFlow = 0;
      for (const s in serverObj) {
        const flow = serverObj[s].flow || 0;
        if (+s === server.id) {
          realFlow = flow;
        }
        sumFlow += Math.ceil(flow * serverObj[s].scale);
      }

      const flowPacks = yield knex('webgui_flow_pack').where({ accountId: account.id }).whereBetween('createTime', [startTime, endTime]);
      const flowWithFlowPacks = flowPacks.reduce(function (a, b) {
        return { flow: a.flow + b.flow };
      }, { flow: data.flow }).flow;

      let nextCheckTime = (flowWithFlowPacks - sumFlow) / 200000000 * 60 * 1000 / server.scale;
      if (nextCheckTime >= account.expireTime - Date.now() && account.expireTime - Date.now() > 0) {
        nextCheckTime = account.expireTime - Date.now();
      }
      if (nextCheckTime <= 0) {
        nextCheckTime = 600 * 1000;
      }
      if (nextCheckTime >= 3 * 60 * 60 * 1000) {
        nextCheckTime = 3 * 60 * 60 * 1000;
      }
      yield writeFlow(server.id, account.id, realFlow, nextCheckTime);

      return sumFlow >= flowWithFlowPacks;
    } else {
      yield writeFlow(server.id, account.id, 0, 30 * 60 * 1000 + Number(Math.random().toString().substr(2, 7)));
      return false;
    }
  });

  return function isOverFlow(_x8, _x9) {
    return _ref4.apply(this, arguments);
  };
})();

const deletePort = (server, account) => {
  // console.log(`del ${ server.name } ${ account.port }`);
  const portNumber = server.shift + account.port;
  manager.send({
    command: 'del',
    port: portNumber
  }, {
    host: server.host,
    port: server.port,
    password: server.password
  }).catch();
};

const addPort = (server, account) => {
  // console.log(`add ${ server.name } ${ account.port }`);
  const portNumber = server.shift + account.port;
  manager.send({
    command: 'add',
    port: portNumber,
    password: account.password
  }, {
    host: server.host,
    port: server.port,
    password: server.password
  }).catch();
};

const deleteExtraPorts = (() => {
  var _ref6 = _asyncToGenerator(function* (serverInfo) {
    try {
      const currentPorts = yield manager.send({ command: 'list' }, {
        host: serverInfo.host,
        port: serverInfo.port,
        password: serverInfo.password
      });
      const accounts = yield knex('account_plugin').where({});
      const accountObj = {};
      accounts.forEach(function (account) {
        accountObj[account.port] = account;
      });
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = currentPorts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          let p = _step.value;

          if (accountObj[p.port - serverInfo.shift]) {
            continue;
          }
          yield sleep(sleepTime);
          deletePort(serverInfo, { port: p.port - serverInfo.shift });
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
    } catch (err) {
      console.log(err);
    }
  });

  return function deleteExtraPorts(_x14) {
    return _ref6.apply(this, arguments);
  };
})();

const checkAccount = (() => {
  var _ref7 = _asyncToGenerator(function* (serverId, accountId) {
    try {
      const serverInfo = yield knex('server').where({ id: serverId }).then(function (s) {
        return s[0];
      });
      if (!serverInfo) {
        yield knex('account_flow').delete().where({ serverId });
        return;
      }
      const accountInfo = yield knex('account_plugin').where({ id: accountId }).then(function (s) {
        return s[0];
      });
      if (!accountInfo) {
        yield knex('account_flow').delete().where({ serverId, accountId });
        return;
      }

      // 检查当前端口是否存在
      const exists = yield isPortExists(serverInfo, accountInfo);

      // 检查账号是否包含该服务器
      if (!hasServer(serverInfo, accountInfo)) {
        yield modifyAccountFlow(serverInfo.id, accountInfo.id, 20 * 60 * 1000 + randomInt(30000));
        exists && deletePort(serverInfo, accountInfo);
        return;
      }

      // 检查账号是否过期
      if (isExpired(serverInfo, accountInfo)) {
        exists && deletePort(serverInfo, accountInfo);
        return;
      }

      // 检查账号是否被ban
      if (yield isBaned(serverInfo, accountInfo)) {
        exists && deletePort(serverInfo, accountInfo);
        return;
      }

      // 检查账号是否超流量
      if (yield isOverFlow(serverInfo, accountInfo)) {
        exists && deletePort(serverInfo, accountInfo);
        return;
      }

      !exists && addPort(serverInfo, accountInfo);
    } catch (err) {
      console.log(err);
    }
  });

  return function checkAccount(_x15, _x16) {
    return _ref7.apply(this, arguments);
  };
})();

_asyncToGenerator(function* () {
  while (true) {
    try {
      const start = Date.now();
      yield sleep(sleepTime);
      const servers = yield knex('server').where({});
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = servers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          const server = _step2.value;

          yield sleep(1000);
          yield deleteExtraPorts(server);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      yield sleep(sleepTime);
      const accounts = yield knex('account_plugin').select(['account_plugin.id as id']).crossJoin('server').leftJoin('account_flow', function () {
        this.on('account_flow.serverId', 'server.id').on('account_flow.accountId', 'account_plugin.id');
      }).whereNull('account_flow.id');
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = accounts[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          let account = _step3.value;

          yield sleep(sleepTime);
          yield accountFlow.add(account.id);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      const end = Date.now();
      if (end - start <= 67 * 1000) {
        yield sleep(67 * 1000 - (end - start));
      }
    } catch (err) {
      console.log(err);
    }
  }
})();

_asyncToGenerator(function* () {
  while (true) {
    const start = Date.now();
    let accounts = [];
    try {
      const datas = yield knex('account_flow').select().where('nextCheckTime', '<', Date.now()).orderBy('nextCheckTime', 'asc').limit(600);
      accounts = [...accounts, ...datas];
      if (datas.length < 30) {
        accounts = [...accounts, ...(yield knex('account_flow').select().where('nextCheckTime', '>', Date.now()).orderBy('nextCheckTime', 'asc').limit(30 - datas.length))];
      }
    } catch (err) {
      console.log(err);
    }
    try {
      const datas = yield knex('account_flow').select().orderBy('updateTime', 'desc').where('checkTime', '<', Date.now() - 60000).limit(15);
      accounts = [...accounts, ...datas];
    } catch (err) {
      console.log(err);
    }
    try {
      datas = yield knex('account_flow').select().orderByRaw('rand()').limit(5);
      accounts = [...accounts, ...datas];
    } catch (err) {}
    try {
      datas = yield knex('account_flow').select().orderByRaw('random()').limit(5);
      accounts = [...accounts, ...datas];
    } catch (err) {}

    if (accounts.length <= 120) {
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = accounts[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          const account = _step4.value;

          const start = Date.now();
          yield checkAccount(account.serverId, account.accountId).catch();
          const time = 60 * 1000 / accounts.length - (Date.now() - start);
          yield sleep(time <= 0 || time > sleepTime ? sleepTime : time);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    } else {
      yield Promise.all(accounts.map(function (account, index) {
        return sleep(index * (60 + Math.ceil(accounts.length % 10)) * 1000 / accounts.length).then(function () {
          return checkAccount(account.serverId, account.accountId);
        });
      }));
    }
    if (accounts.length) {
      logger.info(`check ${accounts.length} accounts, ${Date.now() - start} ms`);
    } else {
      yield sleep(30 * 1000);
    }
  }
})();