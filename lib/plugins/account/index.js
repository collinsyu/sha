'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const serverManager = appRequire('plugins/flowSaver/server');
const manager = appRequire('services/manager');
const config = appRequire('services/config').all();
const macAccount = appRequire('plugins/macAccount/index');
const orderPlugin = appRequire('plugins/webgui_order');
const accountFlow = appRequire('plugins/account/accountFlow');

const addAccount = (() => {
  var _ref = _asyncToGenerator(function* (type, options) {
    if (type === 6 || type === 7) {
      type = 3;
    }
    if (type === 1) {
      var _ref2 = yield knex('account_plugin').insert({
        type,
        orderId: 0,
        userId: options.user,
        port: options.port,
        password: options.password,
        status: 0,
        server: options.server ? options.server : null,
        autoRemove: 0
      }),
          _ref3 = _slicedToArray(_ref2, 1);

      const accountId = _ref3[0];

      yield accountFlow.add(accountId);
      return;
    } else if (type >= 2 && type <= 5) {
      var _ref4 = yield knex('account_plugin').insert({
        type,
        orderId: options.orderId || 0,
        userId: options.user,
        port: options.port,
        password: options.password,
        data: JSON.stringify({
          create: options.time || Date.now(),
          flow: options.flow || 1 * 1000 * 1000 * 1000,
          limit: options.limit || 1
        }),
        status: 0,
        server: options.server ? options.server : null,
        autoRemove: options.autoRemove || 0,
        autoRemoveDelay: options.autoRemoveDelay || 0,
        multiServerFlow: options.multiServerFlow || 0
      }),
          _ref5 = _slicedToArray(_ref4, 1);

      const accountId = _ref5[0];

      yield accountFlow.add(accountId);
      return;
    }
  });

  return function addAccount(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const changePort = (() => {
  var _ref6 = _asyncToGenerator(function* (id, port) {
    const result = yield knex('account_plugin').update({ port }).where({ id });
    yield accountFlow.edit(id);
  });

  return function changePort(_x3, _x4) {
    return _ref6.apply(this, arguments);
  };
})();

const getAccount = (() => {
  var _ref7 = _asyncToGenerator(function* (options = {}) {
    const where = {};
    if (options.id) {
      where['account_plugin.id'] = options.id;
    }
    if (options.userId) {
      where['user.id'] = options.userId;
    }
    if (options.port) {
      where['account_plugin.port'] = options.port;
    }
    if (options.group >= 0) {
      where['user.group'] = options.group;
    }
    const account = yield knex('account_plugin').select(['account_plugin.id', 'account_plugin.type', 'account_plugin.orderId', 'account_plugin.userId', 'account_plugin.server', 'account_plugin.port', 'account_plugin.password', 'account_plugin.data', 'account_plugin.status', 'account_plugin.autoRemove', 'account_plugin.autoRemoveDelay', 'account_plugin.multiServerFlow', 'user.id as userId', 'user.email as user']).leftJoin('user', 'user.id', 'account_plugin.userId').where(where);
    return account;
  });

  return function getAccount() {
    return _ref7.apply(this, arguments);
  };
})();

const delAccount = (() => {
  var _ref8 = _asyncToGenerator(function* (id) {
    const accountInfo = yield knex('account_plugin').where({ id }).then(function (s) {
      return s[0];
    });
    if (!accountInfo) {
      return Promise.reject('Account id[' + id + '] not found');
    }
    const result = yield knex('account_plugin').delete().where({ id });
    const servers = yield knex('server').where({});
    servers.forEach(function (server) {
      manager.send({
        command: 'del',
        port: accountInfo.port + server.shift
      }, {
        host: server.host,
        port: server.port,
        password: server.password
      });
    });
    yield accountFlow.del(id);
    return result;
  });

  return function delAccount(_x5) {
    return _ref8.apply(this, arguments);
  };
})();

const editAccount = (() => {
  var _ref9 = _asyncToGenerator(function* (id, options) {
    const account = yield knex('account_plugin').where({ id }).then(function (success) {
      if (success.length) {
        return success[0];
      }
      return Promise.reject('account not found');
    });
    const update = {};
    update.type = options.type;
    update.orderId = options.orderId;
    update.userId = options.userId;
    update.autoRemove = options.autoRemove;
    update.autoRemoveDelay = options.autoRemoveDelay;
    update.multiServerFlow = options.multiServerFlow;
    if (options.hasOwnProperty('server')) {
      update.server = options.server ? JSON.stringify(options.server) : null;
    }
    if (options.type === 1) {
      update.data = null;
    } else if (options.type >= 2 && options.type <= 5) {
      update.data = JSON.stringify({
        create: options.time || Date.now(),
        flow: options.flow || 1 * 1000 * 1000 * 1000,
        limit: options.limit || 1
      });
    }
    if (options.port) {
      update.port = +options.port;
      if (+options.port !== account.port) {
        const servers = yield knex('server').where({});
        servers.forEach(function (server) {
          manager.send({
            command: 'del',
            port: account.port + server.shift
          }, {
            host: server.host,
            port: server.port,
            password: server.password
          });
        });
      }
    }
    yield knex('account_plugin').update(update).where({ id });
    yield yield accountFlow.edit(id);
    return;
  });

  return function editAccount(_x6, _x7) {
    return _ref9.apply(this, arguments);
  };
})();

const editAccountTime = (() => {
  var _ref10 = _asyncToGenerator(function* (id, timeString, check) {
    const time = +timeString;
    let accountInfo = yield knex('account_plugin').where({ id }).then(function (s) {
      return s[0];
    });
    if (accountInfo.type < 2 || accountInfo.type > 5) {
      return;
    }
    accountInfo.data = JSON.parse(accountInfo.data);
    const timePeriod = {
      '2': 7 * 86400 * 1000,
      '3': 30 * 86400 * 1000,
      '4': 1 * 86400 * 1000,
      '5': 3600 * 1000
    };
    accountInfo.data.create += time;
    while (time > 0 && accountInfo.data.create >= Date.now()) {
      accountInfo.data.limit += 1;
      accountInfo.data.create -= timePeriod[accountInfo.type];
    }
    yield knex('account_plugin').update({
      data: JSON.stringify(accountInfo.data)
    }).where({ id });
    yield accountFlow.edit(id);
  });

  return function editAccountTime(_x8, _x9, _x10) {
    return _ref10.apply(this, arguments);
  };
})();

const editAccountTimeForRef = (() => {
  var _ref11 = _asyncToGenerator(function* (id, timeString, check) {
    const time = +timeString;
    let accountInfo = yield knex('account_plugin').where({ id }).then(function (s) {
      return s[0];
    });
    if (accountInfo.type < 2 || accountInfo.type > 5) {
      return;
    }
    accountInfo.data = JSON.parse(accountInfo.data);
    const timePeriod = {
      '2': 7 * 86400 * 1000,
      '3': 30 * 86400 * 1000,
      '4': 1 * 86400 * 1000,
      '5': 3600 * 1000
    };
    if (accountInfo.data.create + timePeriod[accountInfo.type] * accountInfo.data.limit <= Date.now()) {
      accountInfo.data.limit = 1;
      accountInfo.data.create = Date.now() + time - timePeriod[accountInfo.type];
    } else {
      accountInfo.data.create += time;
    }
    while (time > 0 && accountInfo.data.create >= Date.now()) {
      accountInfo.data.limit += 1;
      accountInfo.data.create -= timePeriod[accountInfo.type];
    }
    yield knex('account_plugin').update({
      data: JSON.stringify(accountInfo.data)
    }).where({ id });
    yield accountFlow.edit(id);
  });

  return function editAccountTimeForRef(_x11, _x12, _x13) {
    return _ref11.apply(this, arguments);
  };
})();

const changePassword = (() => {
  var _ref12 = _asyncToGenerator(function* (id, password) {
    const account = yield knex('account_plugin').select().where({ id }).then(function (success) {
      if (success.length) {
        return success[0];
      }
      return Promise.reject('account not found');
    });
    yield knex('account_plugin').update({
      password
    }).where({ id });
    yield accountFlow.pwd(id, password);
    return;
  });

  return function changePassword(_x14, _x15) {
    return _ref12.apply(this, arguments);
  };
})();

const addAccountLimit = (() => {
  var _ref13 = _asyncToGenerator(function* (id, number = 1) {
    const account = yield knex('account_plugin').select().where({ id }).then(function (success) {
      if (success.length) {
        return success[0];
      }
      return Promise.reject('account not found');
    });
    if (account.type < 2 || account.type > 5) {
      return;
    }
    const accountData = JSON.parse(account.data);
    const timePeriod = {
      '2': 7 * 86400 * 1000,
      '3': 30 * 86400 * 1000,
      '4': 1 * 86400 * 1000,
      '5': 3600 * 1000
    };
    if (accountData.create + accountData.limit * timePeriod[account.type] <= Date.now()) {
      accountData.create = Date.now();
      accountData.limit = number;
    } else {
      accountData.limit += number;
    }
    yield knex('account_plugin').update({
      data: JSON.stringify(accountData)
    }).where({ id });
    return;
  });

  return function addAccountLimit(_x16) {
    return _ref13.apply(this, arguments);
  };
})();

const addAccountLimitToMonth = (() => {
  var _ref14 = _asyncToGenerator(function* (userId, accountId, number = 1) {
    if (!accountId) {
      const port = yield knex('account_plugin').select().orderBy('port', 'DESC').limit(1).then(function (success) {
        if (success.length) {
          return success[0].port + 1;
        } else {
          return 50000;
        }
      });
      yield addAccount(3, {
        user: userId,
        port,
        password: Math.random().toString().substr(2, 10),
        time: Date.now(),
        limit: number,
        flow: 200 * 1000 * 1000 * 1000,
        autoRemove: 0
      });
      return;
    }
    const account = yield knex('account_plugin').select().where({ id: accountId }).then(function (success) {
      if (success.length) {
        return success[0];
      }
      return Promise.reject('account not found');
    });
    if (account.type < 2 || account.type > 5) {
      return;
    }
    const accountData = JSON.parse(account.data);
    accountData.flow = 200 * 1000 * 1000 * 1000;
    if (account.type === 3) {
      if (accountData.create + accountData.limit * 30 * 86400 * 1000 <= Date.now()) {
        accountData.create = Date.now();
        accountData.limit = number;
      } else {
        accountData.limit += number;
      }
    } else {
      const timePeriod = {
        '2': 7 * 86400 * 1000,
        '3': 30 * 86400 * 1000,
        '4': 1 * 86400 * 1000,
        '5': 3600 * 1000
      };
      let expireTime = accountData.create + accountData.limit * timePeriod[account.type];
      if (expireTime <= Date.now()) {
        expireTime = 30 * 86400 * 1000 * number + Date.now();
      } else {
        expireTime += 30 * 86400 * 1000 * number;
      }
      accountData.create = expireTime;
      accountData.limit = 0;
      while (accountData.create >= Date.now()) {
        accountData.limit += 1;
        accountData.create -= 30 * 86400 * 1000;
      }
    }
    yield knex('account_plugin').update({
      type: 3,
      data: JSON.stringify(accountData),
      autoRemove: 0
    }).where({ id: accountId });
    return;
  });

  return function addAccountLimitToMonth(_x17, _x18) {
    return _ref14.apply(this, arguments);
  };
})();

const setAccountLimit = (() => {
  var _ref15 = _asyncToGenerator(function* (userId, accountId, orderId) {
    const orderInfo = yield orderPlugin.getOneOrder(orderId);
    if (orderInfo.baseId) {
      yield knex('webgui_flow_pack').insert({
        accountId,
        flow: orderInfo.flow,
        createTime: Date.now()
      });
      yield accountFlow.edit(accountId);
      return;
    }
    const limit = orderInfo.cycle;
    const orderType = orderInfo.type;
    let account;
    if (accountId) {
      account = yield knex('account_plugin').select().where({ id: accountId }).then(function (success) {
        if (success.length) {
          return success[0];
        }
        return null;
      });
    }
    if (!accountId || !account) {
      const getNewPort = function getNewPort() {
        let orderPorts = [];
        if (orderInfo.portRange !== '0') {
          try {
            orderInfo.portRange.split(',').filter(function (f) {
              return f.trim();
            }).forEach(function (f) {
              if (f.indexOf('-')) {
                const start = f.split('-').filter(function (f) {
                  return f.trim();
                })[0];
                const end = f.split('-').filter(function (f) {
                  return f.trim();
                })[1];
                if (start >= end) {
                  return;
                }
                for (let p = start; p <= end; p++) {
                  orderPorts.indexOf(p) >= 0 || orderPorts.push(p);
                }
              } else {
                orderPorts.indexOf(+f) >= 0 || orderPorts.push(+f);
              }
            });
          } catch (err) {
            console.log(err);
          }
        }
        return knex('webguiSetting').select().where({
          key: 'account'
        }).then(function (success) {
          if (!success.length) {
            return Promise.reject('settings not found');
          }
          success[0].value = JSON.parse(success[0].value);
          return success[0].value.port;
        }).then(function (port) {
          if (port.random) {
            const getRandomPort = function getRandomPort() {
              if (orderPorts.length) {
                return orderPorts[Math.floor(Math.random() * orderPorts.length)];
              } else {
                return Math.floor(Math.random() * (port.end - port.start + 1) + port.start);
              }
            };
            let retry = 0;
            let myPort = getRandomPort();
            const checkIfPortExists = function checkIfPortExists(port) {
              let myPort = port;
              return knex('account_plugin').select().where({ port }).then(function (success) {
                if (success.length && retry <= 30) {
                  retry++;
                  myPort = getRandomPort();
                  return checkIfPortExists(myPort);
                } else if (success.length && retry > 30) {
                  return Promise.reject('Can not get a random port');
                } else {
                  return myPort;
                }
              });
            };
            return checkIfPortExists(myPort);
          } else {
            let query;
            if (orderPorts.length) {
              query = knex('account_plugin').select().whereIn('port', orderPorts).orderBy('port', 'ASC');
            } else {
              query = knex('account_plugin').select().whereBetween('port', [port.start, port.end]).orderBy('port', 'ASC');
            }
            return query.then(function (success) {
              const portArray = success.map(function (m) {
                return m.port;
              });
              let myPort;
              if (orderPorts.length) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                  for (var _iterator = orderPorts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    const p = _step.value;

                    if (portArray.indexOf(p) < 0) {
                      myPort = p;break;
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
              } else {
                for (let p = port.start; p <= port.end; p++) {
                  if (portArray.indexOf(p) < 0) {
                    myPort = p;break;
                  }
                }
              }
              if (myPort) {
                return myPort;
              } else {
                return Promise.reject('no port');
              }
            });
          }
        });
      };
      const port = yield getNewPort();
      yield addAccount(orderType, {
        orderId,
        user: userId,
        port,
        password: Math.random().toString().substr(2, 10),
        time: Date.now(),
        limit,
        flow: orderInfo.flow,
        server: orderInfo.server,
        autoRemove: orderInfo.autoRemove ? 1 : 0,
        autoRemoveDelay: orderInfo.autoRemoveDelay,
        multiServerFlow: orderInfo.multiServerFlow ? 1 : 0
      });
      return;
    }
    const accountData = JSON.parse(account.data);
    accountData.flow = orderInfo.flow;
    const timePeriod = {
      '2': 7 * 86400 * 1000,
      '3': 30 * 86400 * 1000,
      '4': 1 * 86400 * 1000,
      '5': 3600 * 1000,
      '6': 3 * 30 * 86400 * 1000,
      '7': 12 * 30 * 86400 * 1000
    };
    let expireTime = accountData.create + accountData.limit * timePeriod[account.type];
    if (expireTime <= Date.now()) {
      expireTime = timePeriod[orderType] * limit + Date.now();
    } else {
      expireTime += timePeriod[orderType] * limit;
    }
    let countTime = timePeriod[orderType];
    if (orderType === 6) {
      countTime = timePeriod[3];
    }
    if (orderType === 7) {
      countTime = timePeriod[3];
    }
    accountData.create = expireTime - countTime;
    accountData.limit = 1;
    while (accountData.create >= Date.now()) {
      accountData.limit += 1;
      accountData.create -= countTime;
    }
    // let port = await getAccount({ id: accountId }).then(success => success[0].port);
    yield knex('account_plugin').update({
      type: orderType >= 6 ? 3 : orderType,
      orderId,
      data: JSON.stringify(accountData),
      server: orderInfo.server,
      autoRemove: orderInfo.autoRemove ? 1 : 0,
      multiServerFlow: orderInfo.multiServerFlow ? 1 : 0
    }).where({ id: accountId });
    yield accountFlow.edit(accountId);
    return;
  });

  return function setAccountLimit(_x19, _x20, _x21) {
    return _ref15.apply(this, arguments);
  };
})();

const addAccountTime = (() => {
  var _ref16 = _asyncToGenerator(function* (userId, accountId, accountType, accountPeriod = 1) {
    // type: 2 周 ,3 月, 4 天, 5 小时
    const getTimeByType = function getTimeByType(type) {
      const time = {
        '2': 7 * 24 * 60 * 60 * 1000,
        '3': 30 * 24 * 60 * 60 * 1000,
        '4': 24 * 60 * 60 * 1000,
        '5': 60 * 60 * 1000
      };
      return time[type];
    };

    const paymentInfo = yield knex('webguiSetting').select().where({
      key: 'payment'
    }).then(function (success) {
      if (!success.length) {
        return Promise.reject('settings not found');
      }
      success[0].value = JSON.parse(success[0].value);
      return success[0].value;
    });
    const getPaymentInfo = function getPaymentInfo(type) {
      const pay = {
        '2': 'week',
        '3': 'month',
        '4': 'day',
        '5': 'hour'
      };
      return paymentInfo[pay[type]];
    };

    const checkIfAccountExists = (() => {
      var _ref17 = _asyncToGenerator(function* (accountId) {
        if (!accountId) {
          return null;
        }
        const account = yield knex('account_plugin').where({ id: accountId });
        if (!account.length) {
          return null;
        }
        const accountInfo = account[0];
        accountInfo.data = JSON.parse(account[0].data);
        return accountInfo;
      });

      return function checkIfAccountExists(_x25) {
        return _ref17.apply(this, arguments);
      };
    })();

    const accountInfo = yield checkIfAccountExists(accountId);
    if (!accountInfo) {
      const getNewPort = (() => {
        var _ref18 = _asyncToGenerator(function* () {
          const port = yield knex('webguiSetting').select().where({
            key: 'account'
          }).then(function (success) {
            if (!success.length) {
              return Promise.reject('settings not found');
            }
            success[0].value = JSON.parse(success[0].value);
            return success[0].value.port;
          });
          if (port.random) {
            const getRandomPort = function getRandomPort() {
              return Math.floor(Math.random() * (port.end - port.start + 1) + port.start);
            };
            let retry = 0;
            let myPort = getRandomPort();
            const checkIfPortExists = function checkIfPortExists(port) {
              let myPort = port;
              return knex('account_plugin').select().where({ port }).then(function (success) {
                if (success.length && retry <= 30) {
                  retry++;
                  myPort = getRandomPort();
                  return checkIfPortExists(myPort);
                } else if (success.length && retry > 30) {
                  return Promise.reject('Can not get a random port');
                } else {
                  return myPort;
                }
              });
            };
            return checkIfPortExists(myPort);
          } else {
            return knex('account_plugin').select().whereBetween('port', [port.start, port.end]).orderBy('port', 'DESC').limit(1).then(function (success) {
              if (success.length) {
                return success[0].port + 1;
              }
              return port.start;
            });
          }
        });

        return function getNewPort() {
          return _ref18.apply(this, arguments);
        };
      })();
      const port = yield getNewPort();
      yield knex('account_plugin').insert({
        type: accountType,
        userId,
        server: getPaymentInfo(accountType).server ? JSON.stringify(getPaymentInfo(accountType).server) : null,
        port,
        password: Math.random().toString().substr(2, 10),
        data: JSON.stringify({
          create: Date.now(),
          flow: getPaymentInfo(accountType).flow * 1000 * 1000,
          limit: accountPeriod
        }),
        autoRemove: getPaymentInfo(accountType).autoRemove,
        multiServerFlow: getPaymentInfo(accountType).multiServerFlow
      });
      return;
    }

    let onlyIncreaseTime = false;
    if (accountInfo.type === 3 && accountType !== 3) {
      onlyIncreaseTime = true;
    }
    if (accountInfo.type === 2 && (accountType === 4 || accountType === 5)) {
      onlyIncreaseTime = true;
    }
    if (accountInfo.type === 4 && accountType === 5) {
      onlyIncreaseTime = true;
    }

    const isAccountOutOfDate = function isAccountOutOfDate(accountInfo) {
      const expire = accountInfo.data.create + accountInfo.data.limit * getTimeByType(accountInfo.type);
      return expire <= Date.now();
    };

    if (onlyIncreaseTime) {
      let expireTime;
      if (isAccountOutOfDate(accountInfo)) {
        expireTime = Date.now() + getTimeByType(accountType) * accountPeriod;
      } else {
        expireTime = accountInfo.data.create + getTimeByType(accountInfo.type) * accountInfo.data.limit + getTimeByType(accountType) * accountPeriod;
      }
      let createTime = expireTime - getTimeByType(accountInfo.type);
      let limit = 1;
      while (createTime >= Date.now()) {
        limit += 1;
        createTime -= getTimeByType(accountInfo.type);
      }
      yield knex('account_plugin').update({
        data: JSON.stringify({
          create: createTime,
          flow: accountInfo.data.flow,
          limit
        })
      }).where({ id: accountId });
      return;
    }

    let expireTime;
    if (isAccountOutOfDate(accountInfo)) {
      expireTime = Date.now() + getTimeByType(accountType) * accountPeriod;
    } else {
      expireTime = accountInfo.data.create + getTimeByType(accountInfo.type) * accountInfo.data.limit + getTimeByType(accountType) * accountPeriod;
    }
    let createTime = expireTime - getTimeByType(accountType);
    let limit = 1;
    while (createTime >= Date.now()) {
      limit += 1;
      createTime -= getTimeByType(accountType);
    }
    yield knex('account_plugin').update({
      type: accountType,
      server: getPaymentInfo(accountType).server ? JSON.stringify(getPaymentInfo(accountType).server) : null,
      data: JSON.stringify({
        create: createTime,
        flow: getPaymentInfo(accountType).flow * 1000 * 1000,
        limit
      }),
      autoRemove: getPaymentInfo(accountType).autoRemove,
      multiServerFlow: getPaymentInfo(accountType).multiServerFlow
    }).where({ id: accountId });
    return;
  });

  return function addAccountTime(_x22, _x23, _x24) {
    return _ref16.apply(this, arguments);
  };
})();

const banAccount = (() => {
  var _ref19 = _asyncToGenerator(function* (options) {
    const serverId = options.serverId;
    const accountId = options.accountId;
    const time = options.time;
    yield knex('account_flow').update({
      status: 'ban',
      nextCheckTime: Date.now(),
      autobanTime: Date.now() + time
    }).where({
      serverId, accountId
    });
  });

  return function banAccount(_x26) {
    return _ref19.apply(this, arguments);
  };
})();

const getBanAccount = (() => {
  var _ref20 = _asyncToGenerator(function* (options) {
    const serverId = options.serverId;
    const accountId = options.accountId;
    const accountInfo = yield knex('account_flow').select(['autobanTime as banTime']).where({
      serverId, accountId, status: 'ban'
    });
    if (!accountInfo.length) {
      return { banTime: 0 };
    }
    return accountInfo[0];
  });

  return function getBanAccount(_x27) {
    return _ref20.apply(this, arguments);
  };
})();

const loginLog = {};
const scanLoginLog = ip => {
  for (let i in loginLog) {
    if (Date.now() - loginLog[i].time >= 10 * 60 * 1000) {
      delete loginLog[i];
    }
  }
  if (!loginLog[ip]) {
    return false;
  } else if (loginLog[ip].mac.length <= 10) {
    return false;
  } else {
    return true;
  }
};
const loginFail = (mac, ip) => {
  if (!loginLog[ip]) {
    loginLog[ip] = { mac: [mac], time: Date.now() };
  } else {
    if (loginLog[ip].mac.indexOf(mac) < 0) {
      loginLog[ip].mac.push(mac);
      loginLog[ip].time = Date.now();
    }
  }
};

const getAccountForSubscribe = (() => {
  var _ref21 = _asyncToGenerator(function* (token, ip) {
    if (scanLoginLog(ip)) {
      return Promise.reject('ip is in black list');
    }
    const account = yield knex('account_plugin').where({
      subscribe: token
    }).then(function (s) {
      return s[0];
    });
    if (!account) {
      loginFail(token, ip);
      return Promise.reject('can not find account');
    }
    if (account.data) {
      account.data = JSON.parse(account.data);
    } else {
      account.data = {};
    }
    const servers = yield serverManager.list({ status: false });
    const validServers = servers.filter(function (server) {
      if (!account.data.server) {
        return true;
      }
      return account.data.server.indexOf(server.id) >= 0;
    });
    return { server: validServers, account };
  });

  return function getAccountForSubscribe(_x28, _x29) {
    return _ref21.apply(this, arguments);
  };
})();

const editMultiAccounts = (() => {
  var _ref22 = _asyncToGenerator(function* (orderId, update) {
    const accounts = yield knex('account_plugin').where({ orderId });
    const updateData = {};
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = accounts[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        const account = _step2.value;

        if (update.hasOwnProperty('flow')) {
          const accountData = JSON.parse(account.data);
          accountData.flow = update.flow;
          updateData.data = JSON.stringify(accountData);
        }
        if (update.hasOwnProperty('server')) {
          updateData.server = update.server ? JSON.stringify(update.server) : null;
        }
        if (update.hasOwnProperty('autoRemove')) {
          updateData.autoRemove = update.autoRemove;
        }
        if (Object.keys(updateData).length === 0) {
          break;
        }
        yield knex('account_plugin').update(updateData).where({ id: account.id });
        yield yield accountFlow.edit(account.id);
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
  });

  return function editMultiAccounts(_x30, _x31) {
    return _ref22.apply(this, arguments);
  };
})();

exports.addAccount = addAccount;
exports.getAccount = getAccount;
exports.delAccount = delAccount;
exports.editAccount = editAccount;
exports.editAccountTime = editAccountTime;
exports.editAccountTimeForRef = editAccountTimeForRef;

exports.changePassword = changePassword;
exports.changePort = changePort;

exports.addAccountLimit = addAccountLimit;
exports.addAccountLimitToMonth = addAccountLimitToMonth;
exports.setAccountLimit = setAccountLimit;
exports.addAccountTime = addAccountTime;

exports.banAccount = banAccount;
exports.getBanAccount = getBanAccount;

exports.getAccountForSubscribe = getAccountForSubscribe;

exports.editMultiAccounts = editMultiAccounts;