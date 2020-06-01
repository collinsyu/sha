'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const knex = appRequire('init/knex').knex;

const getGroups = () => {
  return knex('group').where({}).orderBy('id').then(s => s);
};

const getGroupsAndUserNumber = (() => {
  var _ref = _asyncToGenerator(function* () {
    const groups = yield knex('group').select(['group.id as id', 'group.name as name', 'group.comment as comment', knex.raw('count(user.id) as userNumber')]).leftJoin('user', 'user.group', 'group.id').where('user.id', '>', 1).orWhereNull('user.id').groupBy('group.id');
    return groups;
  });

  return function getGroupsAndUserNumber() {
    return _ref.apply(this, arguments);
  };
})();

const getOneGroup = id => {
  return knex('group').select().where({ id }).then(success => {
    if (!success.length) {
      return Promise.reject('group not found');
    }
    return success[0];
  });
};

const addGroup = (name, comment, showNotice, order, multiAccount) => {
  return knex('group').insert({
    name, comment, showNotice, order, multiAccount
  });
};

const editGroup = (id, name, comment, showNotice, order, multiAccount) => {
  return knex('group').update({
    name,
    comment,
    showNotice,
    order,
    multiAccount
  }).where({ id });
};

const deleteGroup = (() => {
  var _ref2 = _asyncToGenerator(function* (id) {
    if (id === 0) {
      return;
    }
    const users = yield knex('user').where({ group: id });
    if (users.length > 0) {
      return Promise.reject('Can not delete group');
    }
    yield knex('group').delete().where({ id });
    return;
  });

  return function deleteGroup(_x) {
    return _ref2.apply(this, arguments);
  };
})();

const setUserGroup = (groupId, userId) => {
  return knex('user').update({ group: groupId }).where({ id: userId });
};

exports.getGroups = getGroups;
exports.getGroupsAndUserNumber = getGroupsAndUserNumber;
exports.getOneGroup = getOneGroup;
exports.addGroup = addGroup;
exports.editGroup = editGroup;
exports.deleteGroup = deleteGroup;
exports.setUserGroup = setUserGroup;