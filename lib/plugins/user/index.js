'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const crypto = require('crypto');
const macAccount = appRequire('plugins/macAccount/index');

const checkPasswordLimit = {
  number: 5,
  time: 30 * 1000
};
const checkPasswordFail = {};

const checkExist = (() => {
  var _ref = _asyncToGenerator(function* (obj) {
    const user = yield knex('user').select().where(obj);
    if (user.length === 0) {
      return;
    } else {
      return Promise.reject('user exists');
    }
  });

  return function checkExist(_x) {
    return _ref.apply(this, arguments);
  };
})();

const md5 = function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
};

const createPassword = function createPassword(password, username) {
  return md5(password + username);
};

const addUser = (() => {
  var _ref2 = _asyncToGenerator(function* (options) {
    try {
      const insert = {};
      if (options.username) {
        yield checkExist({ username: options.username });
        Object.assign(insert, { username: options.username });
      }
      if (options.email) {
        yield checkExist({ email: options.email });
        Object.assign(insert, { email: options.email });
      }
      if (options.telegram) {
        yield checkExist({ telegram: options.telegram });
        Object.assign(insert, { telegram: options.telegram });
      }
      Object.assign(insert, {
        type: options.type,
        createTime: Date.now()
      });
      if (options.username && options.password) {
        Object.assign(insert, {
          password: createPassword(options.password, options.username)
        });
      }
      if (options.group) {
        Object.assign(insert, { group: options.group });
      }
      if (options.telegramId) {
        Object.assign(insert, { telegram: options.telegramId });
      }
      const user = yield knex('user').insert(insert);
      return user;
    } catch (err) {
      console.log(err);
      return Promise.reject(err);
    }
  });

  return function addUser(_x2) {
    return _ref2.apply(this, arguments);
  };
})();

const checkPassword = (() => {
  var _ref3 = _asyncToGenerator(function* (username, password) {
    try {
      const user = yield knex('user').select(['id', 'type', 'username', 'password']).where({
        username
      });
      if (user.length === 0) {
        return Promise.reject('user not exists');
      }
      for (const cpf in checkPasswordFail) {
        if (Date.now() - checkPasswordFail[cpf].time >= checkPasswordLimit.time) {
          delete checkPasswordFail[cpf];
        }
      };
      if (checkPasswordFail[username] && checkPasswordFail[username].number > checkPasswordLimit.number && Date.now() - checkPasswordFail[username].time < checkPasswordLimit.time) {
        return Promise.reject('password retry out of limit');
      }
      if (createPassword(password, username) === user[0].password) {
        yield knex('user').update({
          lastLogin: Date.now()
        }).where({
          username
        });
        return user[0];
      } else {
        if (!checkPasswordFail[username] || Date.now() - checkPasswordFail[username].time >= checkPasswordLimit.time) {
          checkPasswordFail[username] = { number: 1, time: Date.now() };
        } else if (checkPasswordFail[username].number <= checkPasswordLimit.number) {
          checkPasswordFail[username].number += 1;
          checkPasswordFail[username].time = Date.now();
        }
        return Promise.reject('invalid password');
      }
    } catch (err) {
      return Promise.reject(err);
    }
  });

  return function checkPassword(_x3, _x4) {
    return _ref3.apply(this, arguments);
  };
})();

const editUser = (() => {
  var _ref4 = _asyncToGenerator(function* (userInfo, edit) {
    try {
      const username = (yield knex('user').select().where(userInfo))[0].username;
      if (!username) {
        throw new Error('user not found');
      }
      if (edit.password) {
        edit.password = createPassword(edit.password, username);
      }
      const user = yield knex('user').update(edit).where(userInfo);
      return;
    } catch (err) {
      return Promise.reject(err);
    }
  });

  return function editUser(_x5, _x6) {
    return _ref4.apply(this, arguments);
  };
})();

const getUsers = (() => {
  var _ref5 = _asyncToGenerator(function* () {
    const users = yield knex('user').select().where({
      type: 'normal'
    });
    return users;
  });

  return function getUsers() {
    return _ref5.apply(this, arguments);
  };
})();

const getRecentSignUpUsers = (() => {
  var _ref6 = _asyncToGenerator(function* (number, group) {
    const where = { type: 'normal' };
    if (group >= 0) {
      where.group = group;
    }
    const users = yield knex('user').select().where(where).orderBy('createTime', 'desc').limit(number);
    return users;
  });

  return function getRecentSignUpUsers(_x7, _x8) {
    return _ref6.apply(this, arguments);
  };
})();

const getRecentLoginUsers = (() => {
  var _ref7 = _asyncToGenerator(function* (number, group) {
    const where = { type: 'normal' };
    if (group >= 0) {
      where.group = group;
    }
    const users = yield knex('user').select().where(where).orderBy('lastLogin', 'desc').limit(number);
    return users;
  });

  return function getRecentLoginUsers(_x9, _x10) {
    return _ref7.apply(this, arguments);
  };
})();

const getOneUser = (() => {
  var _ref8 = _asyncToGenerator(function* (id) {
    const user = yield knex('user').select().where({
      type: 'normal',
      id
    });
    if (!user.length) {
      return Promise.reject('User not found');
    }
    return user[0];
  });

  return function getOneUser(_x11) {
    return _ref8.apply(this, arguments);
  };
})();

const getOneAdmin = (() => {
  var _ref9 = _asyncToGenerator(function* (id) {
    const user = yield knex('user').select().where({
      type: 'admin',
      id
    }).where('id', '>', 1);
    if (!user.length) {
      return Promise.reject('User not found');
    }
    return user[0];
  });

  return function getOneAdmin(_x12) {
    return _ref9.apply(this, arguments);
  };
})();

const getUserAndPaging = (() => {
  var _ref10 = _asyncToGenerator(function* (opt = {}) {

    const search = opt.search || '';
    const filter = opt.filter || 'all';
    const sort = opt.sort || 'id_asc';
    const page = opt.page || 1;
    const pageSize = opt.pageSize || 20;
    const type = opt.type || ['normal'];
    const group = opt.hasOwnProperty('group') ? opt.group : -1;

    let count = knex('user').select().where('id', '>', 1).whereIn('type', type);

    let users = knex('user').select(['user.id as id', 'user.username as username', 'user.email as email', 'user.telegram as telegram', 'user.password as password', 'user.type as type', 'user.createTime as createTime', 'user.lastLogin as lastLogin', 'user.resetPasswordId as resetPasswordId', 'user.resetPasswordTime as resetPasswordTime', 'account_plugin.port as port']).leftJoin('account_plugin', 'user.id', 'account_plugin.userId').where('user.id', '>', 1).whereIn('user.type', type).groupBy('user.id');

    if (group >= 0) {
      count = count.where({ 'user.group': group });
      users = users.where({ 'user.group': group });
    }
    if (search) {
      count = count.where('username', 'like', `%${search}%`);
      users = users.where('username', 'like', `%${search}%`);
    }

    count = yield count.count('id as count').then(function (success) {
      return success[0].count;
    });
    users = yield users.orderBy(sort.split('_')[0], sort.split('_')[1]).limit(pageSize).offset((page - 1) * pageSize);
    const maxPage = Math.ceil(count / pageSize);
    return {
      total: count,
      page,
      maxPage,
      pageSize,
      users
    };
  });

  return function getUserAndPaging() {
    return _ref10.apply(this, arguments);
  };
})();

const deleteUser = (() => {
  var _ref11 = _asyncToGenerator(function* (userId) {
    if (!userId) {
      return Promise.reject('invalid userId');
    }
    const existAccount = yield knex('account_plugin').select().where({
      userId
    });
    if (existAccount.length) {
      return Promise.reject('delete user fail');
    }
    const macAccounts = yield macAccount.getAccountByUserId(userId);
    if (macAccounts.length) {
      macAccounts.forEach(function (f) {
        macAccount.deleteAccount(f.id);
      });
    }
    const deleteCount = yield knex('user').delete().where({
      id: userId
    }).where('id', '>', 1);
    if (deleteCount >= 1) {
      return;
    } else {
      return Promise.reject('delete user fail');
    }
  });

  return function deleteUser(_x13) {
    return _ref11.apply(this, arguments);
  };
})();

const changePassword = (() => {
  var _ref12 = _asyncToGenerator(function* (userId, oldPassword, newPassword) {
    const userInfo = yield knex('user').where({
      id: userId
    }).then(function (user) {
      if (!user.length) {
        return Promise.reject('user not found');
      }
      return user[0];
    });
    yield checkPassword(userInfo.username, oldPassword);
    yield editUser({
      id: userId
    }, {
      password: newPassword
    });
  });

  return function changePassword(_x14, _x15, _x16) {
    return _ref12.apply(this, arguments);
  };
})();

exports.add = addUser;
exports.edit = editUser;
exports.checkPassword = checkPassword;
exports.get = getUsers;
exports.getRecentSignUp = getRecentSignUpUsers;
exports.getRecentLogin = getRecentLoginUsers;
exports.getOne = getOneUser;
exports.getOneAdmin = getOneAdmin;
exports.getUserAndPaging = getUserAndPaging;
exports.delete = deleteUser;
exports.changePassword = changePassword;