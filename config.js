const config = {
  quantityPerAccount: 1,
  maximalBuyingPrice: 1,
  priceCheckIntervalMs: 2500,
  accountsToUseCount: -1, // with value of -1 will use all available accounts
  timeForCaptchaResolve: 20000,
  priceChecksBeforeLeaderSwap: 5,
  headless: false
};

module.exports = config;
