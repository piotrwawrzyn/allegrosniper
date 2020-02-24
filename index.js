const setup = require('./setup');
const {
  auctions,
  maximalBuyingPrice,
  msInterval,
  accountsToUseCount,
  headless,
  sellerUsername
} = setup;
const AuctionScanner = require('./AuctionScanner');
const UserScanner = require('./UserScanner');
const users = require('./users');
const consoleLogIntro = require('./utils/consoleLogIntro');
const showPatchNotes = require('./utils/showPatchNotes');

const config = { msInterval };

(async () => {
  consoleLogIntro();
  await showPatchNotes();

  await AuctionScanner.launchBrowser(headless);

  for (const [index, user] of users.entries()) {
    if (accountsToUseCount >= 0 && index >= accountsToUseCount) break;

    if (!sellerUsername) {
      const auctionScanner = new AuctionScanner(
        auctions,
        maximalBuyingPrice,
        user,
        config
      );
      auctionScanner.start();
    } else {
      const userScanner = new UserScanner(
        [],
        maximalBuyingPrice,
        user,
        config,
        sellerUsername
      );
      userScanner.start();
    }
  }
})();
