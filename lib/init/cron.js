'use strict';

const later = require('later');
later.date.localTime();

const minute = function minute(fn, time = 1) {
  later.setInterval(fn, later.parse.text(`every ${time} mins`));
};

const second = function second(fn, time = 10) {
  later.setInterval(fn, later.parse.text(`every ${time} seconds`));
};

const cron = function cron(fn, cronString) {
  later.setInterval(fn, later.parse.cron(cronString));
};

exports.minute = minute;
exports.second = second;
exports.cron = cron;