const logToFile = require('log-to-file');
const chalk = require('chalk');

const log = async (message, user, special) => {
  const email = user
    ? `[${user.email}] ${
        special === 'leader' ? `${chalk.magenta('[LEADER] ')}` : ''
      }`
    : '';
  const today = new Date();
  const time = `[${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}]`;
  const msgToFile = email + ' ' + time + ' ' + message;

  logToFile(msgToFile, 'bot.log');

  switch (special) {
    case 'success': {
      message = chalk.greenBright.bold(message);
      break;
    }

    case 'error': {
      message = chalk.redBright.bold(message);
      break;
    }
  }

  const msgToDisplay = `${chalk.yellow(email)}${chalk.cyan(
    time
  )} ${chalk.whiteBright(message)}`;
  console.log(msgToDisplay);
};

module.exports = log;
