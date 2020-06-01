'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const user = appRequire('plugins/user/index');
const refUser = appRequire('plugins/webgui_ref/user');
const account = appRequire('plugins/account/index');

exports.getOneUser = (() => {
  var _ref = _asyncToGenerator(function* (req, res) {
    try {
      const userId = +req.params.userId;
      const userInfo = yield user.getOne(userId);
      const userAccount = yield account.getAccount();
      userInfo.account = userAccount.filter(function (f) {
        return f.userId === +userId;
      });
      const ref = yield refUser.getRefSourceUser(userId);
      userInfo.ref = ref;
      return res.send(userInfo);
    } catch (err) {
      console.log(err);
      res.status(403).end();
    }
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

exports.getUsers = (req, res) => {
  const page = +req.query.page || 1;
  const pageSize = +req.query.pageSize || 20;
  const search = req.query.search || '';
  const sort = req.query.sort || 'id_asc';
  const type = req.query.type || ['normal'];
  const group = req.adminInfo.id === 1 ? +req.query.group : req.adminInfo.group;
  user.getUserAndPaging({
    page,
    pageSize,
    search,
    sort,
    type,
    group
  }).then(success => {
    success.users = success.users.map(m => {
      return {
        id: m.id,
        type: m.type,
        email: m.email,
        lastLogin: m.lastLogin,
        username: m.username,
        port: m.port
      };
    });
    return res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.addUser = (req, res) => {
  req.checkBody('email', 'Invalid email').notEmpty();
  req.checkBody('password', 'Invalid password').notEmpty();
  req.checkBody('type', 'Invalid type').isIn(['normal', 'admin']);
  req.getValidationResult().then(result => {
    if (result.isEmpty()) {
      const email = req.body.email;
      const password = req.body.password;
      const group = req.adminInfo.id === 1 ? 0 : req.adminInfo.group;
      const type = req.adminInfo.id === 1 ? req.body.type : 'normal';
      return user.add({
        username: email,
        email,
        password,
        type,
        group
      });
    }
    result.throw();
  }).then(success => {
    return res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.editUserComment = (req, res) => {
  const userId = +req.params.userId;
  const comment = req.body.comment;
  user.edit({ id: userId }, { comment }).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};