const setup = require('./setup');
const {
  auctions,
  maximalBuyingPrice,
  msInterval,
  accountsToUseCount,
  headless
} = setup;
const Bot = require('./Bot');
const users = require('./users');
const consoleLogIntro = require('./utils/consoleLogIntro');
const showPatchNotes = require('./utils/showPatchNotes');

const config = { msInterval };

(async () => {
  consoleLogIntro();
  await showPatchNotes();

  await Bot.launchBrowser(headless);

  for (const [index, user] of users.entries()) {
    if (accountsToUseCount >= 0 && index >= accountsToUseCount) break;

    const bot = new Bot(auctions, maximalBuyingPrice, user, config);
    Bot.runningInstances.push(bot);
    bot.start();
  }
})();
