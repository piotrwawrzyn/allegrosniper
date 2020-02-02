const setup = require('./setup');
const {
  auctions,
  maximalBuyingPrice,
  msInterval,
  saveScreenshots,
  saveHtmlCode,
  accountsToUseCount
} = setup;
const Bot = require('./Bot');
const users = require('./users');

const config = { msInterval, saveScreenshots, saveHtmlCode };

for (const [index, user] of users.entries()) {
  if (accountsToUseCount >= 0 && index >= accountsToUseCount) break;

  const bot = new Bot(auctions, maximalBuyingPrice, user, config);
  bot.start();
}
