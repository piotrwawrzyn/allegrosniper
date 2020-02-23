const setup = require('./setup');
const {
  auctions,
  maximalBuyingPrice,
  msInterval,
  accountsToUseCount,
  headless,
  sellerUsername
} = setup;
const Bot = require('./Bot');
const ScanningBot = require('./ScanningBot');
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

    if (!sellerUsername) {
      const bot = new Bot(auctions, maximalBuyingPrice, user, config);
      bot.start();
    } else {
      const bot = new ScanningBot(
        [],
        maximalBuyingPrice,
        user,
        config,
        sellerUsername
      );
      bot.start();
    }
  }
})();
