const setup = {
  auctions: ['https://allegro.pl/oferta/testowa-8957690289'],
  sellerUsername: 'kozlakuyq91',
  /* Fill sellerUsername only if you don't know the specific auction but you know the exact seller.
     With this property set up bot will ignore auctions array and will try to find ANY item being sold by the given seller that matches 
     your price condition.
  */
  maximalBuyingPrice: 0,
  msInterval: 2500,
  accountsToUseCount: 3, // with value of -1 will use all available accounts
  headless: false
};

module.exports = setup;
