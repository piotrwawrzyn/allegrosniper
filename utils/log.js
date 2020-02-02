const logToFile = require('log-to-file');

const log = (message, user) => {
  const email = `[${user.email}]`;
  const today = new Date();
  const time = `[${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}]`;
  const logMsg = email + ' ' + time + ' ' + message;
  console.log(logMsg);
  logToFile(logMsg, 'bot.log');
};

module.exports = log;
