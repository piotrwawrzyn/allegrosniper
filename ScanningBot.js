const Bot = require('./Bot');
const sleep = require('./utils/sleep');

/**
 * This class extends bot by a new functionality.
 * Bot now has the abillity to scan through all auctions by the given seller and try to find any auction that meets your price condition.
 */
class ScanningBot extends Bot {
  constructor(auctions, maximalBuyingPrice, user, config, sellerUsername) {
    super(auctions, maximalBuyingPrice, user, config);
    this.sellerUsername = sellerUsername;
  }

  /**
   * Scans all auctions from the single seller and check if any auction meets the price requirements
   */
  async scanSellerAuctions() {
    const params = {
      seller: this.sellerUsername,
      maximalBuyingPrice: this.maximalBuyingPrice
    };

    const url = await this.page.evaluate(async params => {
      let response;
      let page = 1;
      let onlyPromoItemsFound = true;
      while (onlyPromoItemsFound) {
        const url = `https://allegro.pl/uzytkownik/${params.seller}?bmatch=baseline-cl-eyesa2-dict43-uni-1-3-0205&order=p&p=${page}`;
        response = await fetch(url, {
          credentials: 'include',
          headers: {
            accept: 'application/vnd.opbox-web.v2+json',
            'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            dpr: '0.9',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'viewport-width': '1241'
          },
          referrer: url,
          referrerPolicy: 'unsafe-url',
          body: null,
          method: 'GET',
          mode: 'cors'
        });

        const data = await response.json();
        const nonPromoItems =
          data.dataSources['listing-api V3:allegro.listing:3.0'].data.items
            .regular;

        if (nonPromoItems.length) {
          onlyPromoItemsFound = false;

          const [cheapestItem] = nonPromoItems;

          const cheapestItemPrice = parseFloat(
            cheapestItem.sellingMode.buyNow.price.amount
          );

          if (cheapestItemPrice <= params.maximalBuyingPrice) {
            return cheapestItem.url;
          } else {
            return null;
          }
        } else {
          page++;
        }
      }
    }, params);

    return url;
  }

  async scan() {
    this.log('Waiting for URL with auction...');
    while (true) {
      if (Bot.runningInstances[0] === this) {
        // If leading bot (first in the running instances array) then try to find the auction
        this.log(
          `Let me try to find any auction from ${this.sellerUsername} with price <= ${this.maximalBuyingPrice} PLN`
        );

        const urlFound = await this.scanSellerAuctions();

        if (urlFound) {
          this.log(`Found an auction meeting price conditions: ${urlFound}`);
          ScanningBot.urlFound = urlFound;
        }

        // Sleep aditional time to avoid request spam
        await sleep(this.msInterval);
      }

      // Any bot: check if there is a link found by the leading bot
      if (ScanningBot.urlFound) {
        await this.attemptToBuy(ScanningBot.urlFound);
        break;
      }

      // Sleep just a little bit
      await sleep(50);
    }
  }
}

module.exports = ScanningBot;
