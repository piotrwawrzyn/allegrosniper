const config = require('./config');
const {
  maximalBuyingPrice,
  priceCheckIntervalMs,
  accountsToUseCount,
  headless,
  quantityPerAccount,
  timeForCaptchaResolve
} = config;
const AuctionScanner = require('./AuctionScanner');
const users = require('./users');
const consoleLogIntro = require('./utils/consoleLogIntro');
const showPatchNotes = require('./utils/showPatchNotes');
const readFileAndSplitLines = require('./utils/readFileAndSplitLines');
const trimEach = require('./utils/trimEach');

const auctions = trimEach(readFileAndSplitLines('auctions.txt')).filter(
  el => el.trim() !== ''
);

if (!auctions.length)
  throw new Error('No auctions found in auctions.txt file!');

if (!users.length) throw new Error('No users found in users.txt file!');

(async () => {
  consoleLogIntro();
  await showPatchNotes();

  await AuctionScanner.launchBrowser(headless);

  for (const [index, user] of users.entries()) {
    if (accountsToUseCount >= 0 && index >= accountsToUseCount) break;
    const auctionScanner = new AuctionScanner(auctions, user, {
      priceCheckIntervalMs,
      maximalBuyingPrice,
      quantityPerAccount,
      timeForCaptchaResolve
    });
    auctionScanner.start();
  }
})();
