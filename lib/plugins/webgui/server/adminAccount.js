'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const macAccount = appRequire('plugins/macAccount/index');
const account = appRequire('plugins/account/index');
const dns = require('dns');
const net = require('net');
const knex = appRequire('init/knex').knex;

const formatMacAddress = mac => mac.replace(/-/g, '').replace(/:/g, '').toLowerCase();

exports.getMacAccount = (req, res) => {
  const userId = +req.query.userId;
  macAccount.getAccount(userId, -1).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.addMacAccount = (req, res) => {
  const mac = formatMacAddress(req.params.macAddress);
  const userId = req.body.userId;
  const accountId = req.body.accountId;
  const serverId = req.body.serverId;
  macAccount.newAccount(mac, userId, serverId, accountId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.editMacAccount = (req, res) => {
  const id = req.body.id;
  const mac = formatMacAddress(req.body.macAddress);
  const userId = req.body.userId;
  const accountId = req.body.accountId;
  const serverId = req.body.serverId;
  macAccount.editAccount(id, mac, serverId, accountId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.deleteMacAccount = (req, res) => {
  const accountId = +req.query.id;
  macAccount.deleteAccount(accountId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getMacAccountForUser = (req, res) => {
  const mac = req.params.macAddress;
  const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  const noPassword = !!+req.query.noPassword;
  const noFlow = !!+req.query.noFlow;
  macAccount.getAccountForUser(mac.toLowerCase(), ip, {
    noPassword,
    noFlow
  }).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getNoticeForUser = (req, res) => {
  const mac = req.params.macAddress;
  const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  macAccount.getNoticeForUser(mac.toLowerCase(), ip).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.banAccount = (req, res) => {
  const serverId = +req.params.serverId;
  const accountId = +req.params.accountId;
  const time = +req.body.time;
  account.banAccount({
    serverId,
    accountId,
    time
  }).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getBanAccount = (req, res) => {
  const serverId = +req.params.serverId;
  const accountId = +req.params.accountId;
  account.getBanAccount({
    serverId,
    accountId
  }).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

const isMacAddress = str => {
  return str.match(/^([A-Fa-f0-9]{2}[:-]?){5}[A-Fa-f0-9]{2}$/);
};

const getAddress = (address, ip) => {
  let myAddress = address;
  if (address.indexOf(':') >= 0) {
    const hosts = address.split(':');
    const number = Math.ceil(Math.random() * (hosts.length - 1));
    myAddress = hosts[number];
  }
  if (!ip) {
    return Promise.resolve(myAddress);
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

const urlsafeBase64 = str => {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

exports.getSubscribeAccountForUser = (() => {
  var _ref = _asyncToGenerator(function* (req, res) {
    try {
      const ssr = req.query.ssr;
      const resolveIp = req.query.ip;
      const token = req.params.token;
      const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
      if (isMacAddress(token)) {
        yield macAccount.getAccountForUser(token.toLowerCase(), ip, {
          noPassword: 0,
          noFlow: 1
        }).then(function (success) {
          const result = success.servers.map(function (server) {
            return 'ss://' + Buffer.from(server.method + ':' + success.default.password + '@' + server.address + ':' + server.port).toString('base64') + '#' + Buffer.from(server.name).toString('base64');
          }).join('\r\n');
          return res.send(Buffer.from(result).toString('base64'));
        });
      } else {
        const isSubscribeOn = yield knex('webguiSetting').where({
          key: 'account'
        }).then(function (s) {
          return s[0];
        }).then(function (s) {
          return JSON.parse(s.value).subscribe;
        });
        if (!isSubscribeOn) {
          return res.status(404).end();
        }
        const subscribeAccount = yield account.getAccountForSubscribe(token, ip);
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = subscribeAccount.server[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            let s = _step.value;

            s.host = yield getAddress(s.host, +resolveIp);
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

        const baseSetting = yield knex('webguiSetting').where({
          key: 'base'
        }).then(function (s) {
          return s[0];
        }).then(function (s) {
          return JSON.parse(s.value);
        });
        const result = subscribeAccount.server.map(function (s) {
          if (ssr === '1') {
            return 'ssr://' + urlsafeBase64(s.host + ':' + (subscribeAccount.account.port + s.shift) + ':origin:' + s.method + ':plain:' + urlsafeBase64(subscribeAccount.account.password) + '/?obfsparam=&remarks=' + urlsafeBase64(s.name) + '&group=' + urlsafeBase64(baseSetting.title));
          }
          return 'ss://' + Buffer.from(s.method + ':' + subscribeAccount.account.password + '@' + s.host + ':' + (subscribeAccount.account.port + +s.shift)).toString('base64') + '#' + Buffer.from(s.name).toString('base64');
        }).join('\r\n');
        return res.send(Buffer.from(result).toString('base64'));
      }
    } catch (err) {
      console.log(err);
      res.status(403).end();
    }
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();