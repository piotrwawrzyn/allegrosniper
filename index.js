const setup = require('./setup');
const {
  maximalBuyingPrice,
  msInterval,
  accountsToUseCount,
  headless,
  scanQuery,
  quantityPerAccount
} = setup;
const AuctionScanner = require('./AuctionScanner');
const QueryScanner = require('./QueryScanner');
const users = require('./users');
const consoleLogIntro = require('./utils/consoleLogIntro');
const showPatchNotes = require('./utils/showPatchNotes');
const readFileAndSplitLines = require('./utils/readFileAndSplitLines');
const trimEach = require('./utils/trimEach');

const config = {
  msInterval,
  maximalBuyingPrice,
  quantityPerAccount,
  scanQuery
};

const auctions = trimEach(readFileAndSplitLines('auctions.txt'));

if ((auctions.length === 0 || auctions[0] === '') && scanQuery === '')
  throw new Error('No auctions found in auctions.txt file!');

(async () => {
  consoleLogIntro();
  await showPatchNotes();

  await AuctionScanner.launchBrowser(headless);

  for (const [index, user] of users.entries()) {
    if (accountsToUseCount >= 0 && index >= accountsToUseCount) break;

    if (!scanQuery) {
      const auctionScanner = new AuctionScanner(auctions, user, config);
      auctionScanner.start();
    } else {
      const userScanner = new QueryScanner([], user, config);
      userScanner.start();
    }
  }
})();
