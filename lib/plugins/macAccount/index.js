'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const serverPlugin = appRequire('plugins/flowSaver/server');
const accountPlugin = appRequire('plugins/account/index');
const flow = appRequire('plugins/flowSaver/flow');
const dns = require('dns');
const net = require('net');
const config = appRequire('services/config').all();

const getFlow = (() => {
  var _ref = _asyncToGenerator(function* (serverId, accountId) {
    const where = { accountId };
    if (serverId) {
      where.serverId = serverId;
    }
    const result = yield knex('account_flow').sum('flow as sumFlow').groupBy('accountId').where(where).then(function (s) {
      return s[0];
    });
    return result ? result.sumFlow : -1;
  });

  return function getFlow(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const formatMacAddress = mac => {
  return mac.replace(/-/g, '').replace(/:/g, '').toLowerCase();
};

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

const getIp = address => {
  let myAddress = address;
  if (address.indexOf(':') >= 0) {
    const hosts = address.split(':');
    const number = Math.ceil(Math.random() * (hosts.length - 1));
    myAddress = hosts[number];
  }
  if (net.isIP(myAddress)) {
    return Promise.resolve(myAddress);
  }
  return new Promise((resolve, reject) => {
    dns.lookup(myAddress, (err, myAddress, family) => {
      if (err) {
        return reject(err);
      }
      return resolve(myAddress);
    });
  });
};

const newAccount = (mac, userId, serverId, accountId) => {
  return knex('mac_account').insert({
    mac, userId, serverId, accountId
  });
};

const getAccount = (() => {
  var _ref2 = _asyncToGenerator(function* (userId, group) {
    const where = {};
    where['mac_account.userId'] = userId;
    if (group >= 0) {
      where['user.group'] = group;
    }
    const macAccounts = yield knex('mac_account').select(['mac_account.id as id', 'mac_account.userId as userId', 'mac_account.mac as mac', 'mac_account.accountId as accountId', 'mac_account.serverId as serverId']).where(where).leftJoin('user', 'user.id', 'mac_account.userId');
    const accounts = yield knex('account_plugin').where({ userId });
    macAccounts.forEach(function (macAccount) {
      const isExists = accounts.filter(function (f) {
        return f.id === macAccount.accountId;
      })[0];
      if (!isExists && accounts.length) {
        knex('mac_account').update({
          accountId: accounts[0].id
        }).where({
          id: macAccount.id
        }).then();
      }
    });
    return macAccounts;
  });

  return function getAccount(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
})();

const getNoticeForUser = (() => {
  var _ref3 = _asyncToGenerator(function* (mac, ip) {
    if (scanLoginLog(ip)) {
      return Promise.reject('ip is in black list');
    }
    const macAccount = yield knex('mac_account').where({ mac }).then(function (success) {
      return success[0];
    });
    if (!macAccount) {
      loginFail(mac, ip);
      return Promise.reject('mac account not found');
    }
    const userId = macAccount.userId;
    const groupInfo = yield knex('user').select(['group.id as id', 'group.showNotice as showNotice']).innerJoin('group', 'user.group', 'group.id').where({
      'user.id': userId
    }).then(function (s) {
      return s[0];
    });
    const group = [groupInfo.id];
    if (groupInfo.showNotice) {
      group.push(-1);
    }
    const notices = yield knex('notice').select().whereIn('group', group).orderBy('time', 'desc');
    return notices;
  });

  return function getNoticeForUser(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
})();

const getAccountForUser = (() => {
  var _ref4 = _asyncToGenerator(function* (mac, ip, opt) {
    const noPassword = opt.noPassword;
    const noFlow = opt.noFlow;
    if (scanLoginLog(ip)) {
      return Promise.reject('ip is in black list');
    }
    const macAccount = yield knex('mac_account').where({ mac }).then(function (success) {
      return success[0];
    });
    if (!macAccount) {
      loginFail(mac, ip);
      return Promise.reject('mac account not found');
    }
    yield getAccount(macAccount.userId);
    const myServerId = macAccount.serverId;
    const myAccountId = macAccount.accountId;
    const accounts = yield knex('mac_account').select(['mac_account.id', 'mac_account.mac', 'account_plugin.id as accountId', 'account_plugin.port', 'account_plugin.password', 'account_plugin.multiServerFlow as multiServerFlow']).leftJoin('user', 'mac_account.userId', 'user.id').leftJoin('account_plugin', 'mac_account.userId', 'account_plugin.userId');
    const account = accounts.filter(function (a) {
      return a.accountId === myAccountId;
    })[0];
    const accountData = (yield accountPlugin.getAccount({ id: myAccountId }))[0];
    accountData.data = JSON.parse(accountData.data);
    let startTime = 0;
    let expire = 0;
    if (accountData.type >= 2 && accountData.type <= 5) {
      let timePeriod = 0;
      if (accountData.type === 2) {
        timePeriod = 7 * 86400 * 1000;
      }
      if (accountData.type === 3) {
        timePeriod = 30 * 86400 * 1000;
      }
      if (accountData.type === 4) {
        timePeriod = 1 * 86400 * 1000;
      }
      if (accountData.type === 5) {
        timePeriod = 3600 * 1000;
      }
      startTime = accountData.data.create;
      while (startTime + timePeriod <= Date.now()) {
        startTime += timePeriod;
      }
      expire = accountData.data.create + accountData.data.limit * timePeriod;
    }
    const isMultiServerFlow = account.multiServerFlow;
    const servers = yield serverPlugin.list({ status: false });
    let server = servers.filter(function (s) {
      return s.id === myServerId;
    })[0];
    if (!server) {
      server = servers[0];
    }
    const address = yield getIp(server.host);
    const validServers = JSON.parse(accountData.server);
    const serverList = servers.filter(function (f) {
      if (!validServers) {
        return true;
      } else {
        return validServers.indexOf(f.id) >= 0;
      }
    }).map(function (f) {
      let serverInfo;
      return getIp(f.host).then(function (success) {
        serverInfo = {
          id: f.id,
          name: f.name,
          address: success,
          port: account.port + f.shift,
          method: f.method,
          comment: f.comment
        };
        return serverInfo;
      }).then(function (success) {
        if (startTime && !noFlow) {
          return getFlow(isMultiServerFlow ? null : success.id, account.accountId);
          // return flow.getFlowFromSplitTime(isMultiServerFlow ? null : success.id, account.accountId, startTime, Date.now());
        } else {
          return -1;
        }
      }).then(function (success) {
        serverInfo.currentFlow = success;
        if (startTime) {
          serverInfo.flow = accountData.data.flow * (isMultiServerFlow ? 1 : f.scale);
        } else {
          serverInfo.flow = -1;
        }
        serverInfo.expire = expire || null;
        return knex('account_flow').select(['status']).where({
          serverId: f.id,
          accountId: account.accountId
        }).then(function (s) {
          if (!s.length) {
            return 'checked';
          }
          return s[0].status;
        });
      }).then(function (success) {
        serverInfo.status = success;
        serverInfo.base64 = 'ss://' + Buffer.from(server.method + ':' + server.password + '@' + serverInfo.address + ':' + account.port).toString('base64');
        return serverInfo;
      });
    });
    const serverReturn = yield Promise.all(serverList);
    const data = {
      default: {
        site: (config.plugins.macAccount ? config.plugins.macAccount.site : null) || config.plugins.webgui.site,
        id: server.id,
        name: server.name,
        address,
        port: account.port + server.shift,
        password: account.password,
        method: server.method,
        comment: server.comment
      },
      servers: serverReturn
    };
    if (noPassword) {
      delete data.default.password;
    }
    if (!serverReturn.filter(function (f) {
      return f.name === server.name;
    })[0]) {
      data.default.name = serverReturn[0].name;
      data.default.address = serverReturn[0].address;
    }
    return data;
  });

  return function getAccountForUser(_x7, _x8, _x9) {
    return _ref4.apply(this, arguments);
  };
})();

const editAccount = (id, mac, serverId, accountId) => {
  return knex('mac_account').update({
    mac, serverId, accountId
  }).where({ id });
};

const deleteAccount = id => {
  return knex('mac_account').delete().where({ id }).then();
};

const login = (() => {
  var _ref5 = _asyncToGenerator(function* (mac, ip) {
    if (scanLoginLog(ip)) {
      return Promise.reject('ip is in black list');
    }
    const account = yield knex('mac_account').where({
      mac: formatMacAddress(mac)
    }).then(function (success) {
      return success[0];
    });
    if (!account) {
      loginFail(mac, ip);
      return Promise.reject('mac account not found');
    } else {
      return account;
    }
  });

  return function login(_x10, _x11) {
    return _ref5.apply(this, arguments);
  };
})();

const getAccountByAccountId = accountId => {
  return knex('mac_account').where({
    accountId
  });
};

const getAllAccount = (() => {
  var _ref6 = _asyncToGenerator(function* (group) {
    const where = {};
    if (group >= 0) {
      where['user.group'] = group;
    }
    const accounts = yield knex('mac_account').select(['mac_account.id as id', 'mac_account.mac as mac', 'mac_account.userId as userId', 'mac_account.accountId as accountId', 'mac_account.serverId as serverId', 'account_plugin.port as port']).leftJoin('account_plugin', 'mac_account.accountId', 'account_plugin.id').leftJoin('user', 'user.id', 'mac_account.userId').where(where);
    return accounts;
  });

  return function getAllAccount(_x12) {
    return _ref6.apply(this, arguments);
  };
})();

const getAccountByUserId = userId => {
  return knex('mac_account').where({
    userId
  });
};

const removeInvalidMacAccount = (() => {
  var _ref7 = _asyncToGenerator(function* () {
    const accounts = yield knex('mac_account').select(['mac_account.id as id', 'mac_account.mac as mac', 'mac_account.userId as userId', 'mac_account.accountId as accountId', 'mac_account.serverId as serverId', 'user.username as username']).leftJoin('user', 'mac_account.userId', 'user.id').where({});
    accounts.filter(function (f) {
      return f.username === null;
    }).forEach(function (account) {
      knex('mac_account').where({ id: account.id }).del().then();
    });
  });

  return function removeInvalidMacAccount() {
    return _ref7.apply(this, arguments);
  };
})();
removeInvalidMacAccount();

exports.editAccount = editAccount;
exports.newAccount = newAccount;
exports.getAccount = getAccount;
exports.deleteAccount = deleteAccount;
exports.getAccountForUser = getAccountForUser;
exports.getNoticeForUser = getNoticeForUser;
exports.login = login;
exports.getAccountByAccountId = getAccountByAccountId;
exports.getAllAccount = getAllAccount;
exports.getAccountByUserId = getAccountByUserId;