const AuctionScanner = require('./AuctionScanner');
const sleep = require('./utils/sleep');
const FetchingResult = require('./enums/FetchingResult');

class QueryScanner extends AuctionScanner {
  constructor(auctions, user, config) {
    super(auctions, user, config);

    const { scanQuery } = config;

    this.scanQuery = scanQuery;
  }

  /**
   * Scans all auctions on allegro using the provided query and checks if any auction meets the price requirements
   */
  async scanAllegroWithQuery() {
    const params = {
      query: this.scanQuery,
      maximalBuyingPrice: this.maximalBuyingPrice
    };

    const url = await this.page.evaluate(async params => {
      const sleep = async ms => {
        return new Promise(resolve => setTimeout(resolve, ms));
      };

      let response;
      let page = 1;

      // Maximum number of pages to look at, limited to prevent request spamming
      const MAX_PAGES_TO_CHECK = 3;

      const ITERATION_THROTTLE_IN_MS = 15;

      let lastIterationItems;

      while (page <= MAX_PAGES_TO_CHECK) {
        const url = `https://allegro.pl/listing?string=${params.query}&order=p&bmatch=baseline-cl-eyesa2-dict43-ele-1-3-0205&p=${page}`;

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

        if (!data.dataSources['listing-api-v3:allegro.listing:3.0']) break;

        const items =
          data.dataSources['listing-api-v3:allegro.listing:3.0'].data.items;

        if (JSON.stringify(items) === JSON.stringify(lastIterationItems)) break;

        const regularItems = items.regular;

        if (regularItems.length) {
          // There are regular items

          const itemsFulfillingPriceCondition = regularItems.filter(
            item =>
              item.sellingMode.buyNow.price.amount <= params.maximalBuyingPrice
          );

          if (itemsFulfillingPriceCondition.length) {
            // There is at least 1 item fulfilling price condition, let's take the first one (probably the cheapest)
            const [cheapestItem] = itemsFulfillingPriceCondition;

            return cheapestItem.url;
          } else {
            page++;
            // Throttle a little bit to avoid ip ban
            await sleep(ITERATION_THROTTLE_IN_MS);

            lastIterationItems = items;
            continue;
          }
        } else {
          // Check if there are any auctions on this page, if not break the loop
          let noItemsAtAll = true;
          for (const key in items) {
            if (items[key].length !== 0) {
              noItemsAtAll = false;
              break;
            }
          }

          if (noItemsAtAll) {
            break;
          }

          lastIterationItems = items;
          page++;
        }
      }
    }, params);

    return url;
  }

  async scan() {
    this.log('Waiting for URL with auction...');

    while (true) {
      if (AuctionScanner.runningInstances[0] === this) {
        // If leading bot (first in the running instances array) then try to find the auction
        this.log(
          `Searching "${this.scanQuery}" with price <= ${this.maximalBuyingPrice} PLN`,
          'leader'
        );

        const urlFound = await this.scanAllegroWithQuery();

        if (urlFound) {
          this.log(
            `Found an auction meeting both price condition and query condition: ${urlFound}`,
            'leader'
          );
          this.logNotification();
          QueryScanner.urlFound = urlFound;
        }

        // Sleep aditional time to avoid request spam
        await sleep(this.msInterval);
      }

      // Any bot: check if there is a link found by the leading bot
      if (QueryScanner.urlFound) {
        this.logNotificationResponse();
        const { result } = await this.attemptToBuy(QueryScanner.urlFound);

        if (result === FetchingResult.SUCCESSFULY_BOUGHT) {
          break;
        } else {
          this.log('Unsuccessful purchase with result: ' + result, 'error');
          this.log(`Let's go back to scanning`);
          continue;
        }
      }

      // Sleep just a little bit
      await sleep(50);
    }
  }
}

module.exports = QueryScanner;
