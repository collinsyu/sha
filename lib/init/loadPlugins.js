'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const fs = require('fs');
const path = require('path');
const config = appRequire('services/config').all();

const log4js = require('log4js');
const logger = log4js.getLogger('system');

const pluginLists = [];

const loadOnePluginDb = name => {
  const promises = [];
  logger.info(`Load plugin db: [ ${name} ]`);
  try {
    const files = fs.readdirSync(path.resolve(__dirname, `../plugins/${name}`));
    if (files.indexOf('db') >= 0) {
      const dbFiles = fs.readdirSync(path.resolve(__dirname, `../plugins/${name}/db`));
      dbFiles.forEach(f => {
        logger.info(`Load plugin db: [ ${name}/db/${f} ]`);
        promises.push(appRequire(`plugins/${name}/db/${f}`).createTable());
      });
    }
  } catch (err) {
    logger.error(err);
  }
  return Promise.all(promises).then(() => {
    const dependence = appRequire(`plugins/${name}/dependence`);
    logger.info(`Load plugin dependence: [ ${name} ]`);
    dependence.forEach(pluginName => {
      if (pluginLists.indexOf(pluginName) < 0) {
        pluginLists.push(pluginName);
      }
    });
  }).catch(err => {
    // logger.error(err);
  });
};

const loadOnePlugin = name => {
  logger.info(`Load plugin: [ ${name} ]`);
  appRequire(`plugins/${name}/index`);
};

const loadPlugins = () => {
  if (!config.plugins) {
    return;
  }
  if (config.type !== 'm') {
    return;
  }
  for (const name in config.plugins) {
    if (config.plugins[name].use) {
      pluginLists.push(name);
    }
  }
  _asyncToGenerator(function* () {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = pluginLists[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        let pl = _step.value;

        yield loadOnePluginDb(pl);
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

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = pluginLists[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        let pl = _step2.value;

        loadOnePlugin(pl);
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
  })();
};
loadPlugins();