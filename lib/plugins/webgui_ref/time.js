'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;
const account = appRequire('plugins/account/index');
const order = appRequire('plugins/webgui_ref/order');
const orderPlugin = appRequire('plugins/webgui_order');

const getRefSetting = (() => {
  var _ref = _asyncToGenerator(function* () {
    const setting = yield knex('webguiSetting').select().where({
      key: 'webgui_ref'
    }).then(function (success) {
      if (!success.length) {
        return Promise.reject('settings not found');
      }
      success[0].value = JSON.parse(success[0].value);
      return success[0].value;
    });
    return setting;
  });

  return function getRefSetting() {
    return _ref.apply(this, arguments);
  };
})();

const getRef = (() => {
  var _ref2 = _asyncToGenerator(function* (userId) {
    const ref = yield knex('webgui_ref').select(['webgui_ref_code.sourceUserId as sourceUserId']).leftJoin('webgui_ref_code', 'webgui_ref.codeId', 'webgui_ref_code.id').where({
      'webgui_ref.userId': userId
    });
    if (!ref.length) {
      return false;
    }
    if (!ref[0].sourceUserId) {
      return false;
    }
    return ref[0].sourceUserId;
  });

  return function getRef(_x) {
    return _ref2.apply(this, arguments);
  };
})();

const getPaymentInfo = (() => {
  var _ref3 = _asyncToGenerator(function* (type) {
    const payment = yield knex('webguiSetting').where({
      key: 'payment'
    }).then(function (s) {
      return s[0];
    });
    const paymentInfo = JSON.parse(payment.value);
    return paymentInfo[type];
  });

  return function getPaymentInfo(_x2) {
    return _ref3.apply(this, arguments);
  };
})();

const convertRefTime = timeString => {
  let time = 0;
  const timeArray = timeString.split(/(\d{1,}d)|(\d{1,}h)|(\d{1,}m)/).filter(f => f);
  timeArray.forEach(f => {
    if (f[f.length - 1] === 'd') {
      time += +f.substr(0, f.length - 1) * 24 * 60 * 60 * 1000;
    }
    if (f[f.length - 1] === 'h') {
      time += +f.substr(0, f.length - 1) * 60 * 60 * 1000;
    }
    if (f[f.length - 1] === 'm') {
      time += +f.substr(0, f.length - 1) * 60 * 1000;
    }
  });
  return time;
};

const payWithRef = (() => {
  var _ref4 = _asyncToGenerator(function* (userId, orderType) {
    const setting = yield getRefSetting();
    if (!setting.useRef) {
      return;
    }
    const hasRef = yield getRef(userId);
    if (!hasRef) {
      return;
    }
    const orderInfo = yield orderPlugin.getOneOrder(orderType);
    const accounts = yield knex('account_plugin').where({ userId: hasRef });
    if (!accounts.length) {
      return;
    }
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = accounts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        let a = _step.value;

        account.editAccountTimeForRef(a.id, Math.ceil(orderInfo.refTime / accounts.length), true);
        yield order.newOrder({
          user: hasRef,
          refUser: userId,
          account: a.id,
          refTime: Math.ceil(orderInfo.refTime / accounts.length)
        });
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

  return function payWithRef(_x3, _x4) {
    return _ref4.apply(this, arguments);
  };
})();

exports.payWithRef = payWithRef;