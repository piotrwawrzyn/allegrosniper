const setup = {
  auctions: [
    'https://allegro.pl/oferta/woolite-plyn-do-prania-dark-jeans-3-6l-60-pran-8937486245'
  ],
  sellerUsername: '',
  /* Fill sellerUsername only if you don't know the specific auction but you know the exact seller.
     With this property set up bot will ignore auctions array and will try to find ANY item being sold by the given seller that matches 
     your price condition.

     Warning: This feature is experimental
  */
  maximalBuyingPrice: 1,
  msInterval: 700,
  accountsToUseCount: -1, // with value of -1 will use all available accounts
  headless: true
};

module.exports = setup;
