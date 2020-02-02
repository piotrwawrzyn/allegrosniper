// const User = require('./User');
const setup = require('./setup');
const {
  auctions,
  maximalBuyingPrice,
  msInterval,
  saveScreenshots,
  saveHtmlCode
} = setup;
const Bot = require('./Bot');
const users = require('./users');

const config = { msInterval, saveScreenshots, saveHtmlCode };

for (const user of users) {
  const bot = new Bot(auctions, maximalBuyingPrice, user, config);
  bot.start();
}

// const user = new User(email, password);

//

// bot.start();
