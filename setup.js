const setup = {
  quantityPerAccount: 1,
  scanQuery: '',
  /* Fill scan query only if you don't know the specific auction but you know possible search query to get to an auction.
     With this property set up bot will ignore auctions array and try to find any auction on allegro matching your price conditions AND the provided query.

     Example: You know there will be a promotion for Aqua Fresh toothpaste but you don't know the exact auction. Set scan query as "Aqua fresh"

     Tip: Try to use as accurate query as possible but no need to be overspecific
  */
  maximalBuyingPrice: 1,
  msInterval: 1000,
  accountsToUseCount: -1, // with value of -1 will use all available accounts
  headless: false
};

module.exports = setup;
