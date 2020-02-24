const puppeteer = require('puppeteer');
const getAuctionIdFromUrl = require('./utils/getAuctionIdFromUrl');
const log = require('./utils/log');
const sleep = require('./utils/sleep');
const FetchingResult = require('./enums/FetchingResult');
const ReportTable = require('./ReportTable');

class AuctionScanner {
  constructor(auctions, maximalBuyingPrice, user, config) {
    AuctionScanner.runningInstances.push(this);

    const { msInterval } = config;

    this.auctions = auctions;
    this.maximalBuyingPrice = maximalBuyingPrice;
    this.user = user;
    this.msInterval = msInterval;
    this.dateStarted = new Date();

    // Create a map connecting auction urls with auction ids
    this.auctionIdsMap = new Map();

    for (const auction of this.auctions) {
      this.auctionIdsMap.set(auction, getAuctionIdFromUrl(auction));
    }
  }

  static async launchBrowser(headless) {
    log('Creating browser instance');

    AuctionScanner.runningInstances = [];
    AuctionScanner.reportTable = new ReportTable();

    AuctionScanner.browser = await puppeteer.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async getElementByText(elementType, text) {
    const elements = await this.page.$x(
      `//${elementType}[contains(text(), "${text}")]`
    );

    if (elements.length > 0) return elements[0];
    else return null;
  }

  async wait() {
    this.log('Waiting for navigation...');
    await this.page.waitForNavigation();
  }

  async log(message, special) {
    await log(message, this.user, special);
  }

  async closePopup() {
    const popupButtonClass = '._13q9y._8hkto._7qjq4._ey68j._1o9j9._1yx73';
    const popupButton = await this.page.evaluate(
      popupButtonClass => document.querySelector(popupButtonClass),
      popupButtonClass
    );

    if (popupButton) {
      this.log('Closing popup...');
      await this.page.click(popupButtonClass);
      await this.wait();
    }
  }

  async goToUrl(url) {
    this.log('Opening auction...');
    await this.page.goto(url);
  }

  async fillloginData(user) {
    this.log('Filling login form...');

    await this.page.type('#username', user.email);
    await this.page.type('#password', user.password);
    await this.page.click('#login-button');
    await this.wait();
  }

  async openNewIncognitoPage() {
    this.log('Opening new browser context');
    const context = await AuctionScanner.browser.createIncognitoBrowserContext();

    this.page = await context.newPage();
  }

  async createTransaction(auctionUrl, id, justCheckThePrice) {
    const auction = {
      url: auctionUrl,
      id,
      expectedPrice: this.maximalBuyingPrice,
      buyer: this.user,
      justCheckThePrice
    };

    this.lastFetchingStarted = new Date();

    const result = await this.page.evaluate(async auction => {
      let response;

      try {
        response = await fetch('https://allegro.pl/transaction-entry/buy-now', {
          credentials: 'include',
          headers: {
            accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'max-age=0',
            'content-type': 'application/x-www-form-urlencoded',
            dpr: '1',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'viewport-width': '1920'
          },
          referrer: auction.url,
          referrerPolicy: 'unsafe-url',
          body: `item_id=${auction.id}&guest=1&quantity=1`,
          method: 'POST',
          mode: 'cors'
        });
      } catch (err) {
        return {
          result: 'error',
          message: `Failed to fetch buy-now POST call`
        };
      }

      const data = await response.text();

      // Get auction information

      const result = data.match(/(?<=JSON\.parse\(\s*).*?(?=\s*\))/);

      if (result === null)
        return {
          result: 'error',
          message: `Can't parse auction price because no JSON has been found!`
        };

      const jsonStringToParse = result[0];

      const transactionObject = JSON.parse(JSON.parse(jsonStringToParse));

      // I assume that there will always be exactly ONE >>order<< in the array
      if (!transactionObject) {
        return {
          result: 'error',
          message: `Transaction object is null or undefined`
        };
      }

      if (!transactionObject.orders) {
        return {
          result: 'error',
          message: `Orders property in transaction object is null or undefined`
        };
      }

      const [order] = transactionObject.orders;

      // I assume that there will always be exactly ONE >>offer<< in the array
      const [offer] = order.offers;

      if (!order || !offer) return;

      const { totalPrice } = offer;

      if (auction.justCheckThePrice) {
        return { result: 'priceChecked', message: totalPrice };
      }

      if (totalPrice <= auction.expectedPrice) {
        // This is a good time to buy
        const transactionId = transactionObject.id;

        // Payment Id may be null at this point
        let paymentId = transactionObject.payment.id;

        const { delivery } = order;

        if (!delivery)
          return {
            result: 'error',
            message: `Delivery method has not been set`
          };

        try {
          await fetch(
            `https://edge.allegro.pl/purchases/${transactionId}/buy-commands/web`,
            {
              credentials: 'include',
              headers: {
                accept: 'application/vnd.allegro.public.v1+json',
                'accept-language': 'pl-PL',
                'content-type': 'application/vnd.allegro.public.v1+json',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'transaction-type': 'CART'
              },
              referrer: `https://allegro.pl/transaction-front/app/user/purchase/${transactionId}/dapf`,
              referrerPolicy: 'no-referrer-when-downgrade',
              body: '{}',
              method: 'PUT',
              mode: 'cors'
            }
          );
        } catch (err) {
          return {
            result: 'error',
            message: `Failed to fetch buy-commands PUT call`
          };
        }

        try {
          await fetch('https://edge.allegro.pl/payment/finalize', {
            credentials: 'include',
            headers: {
              accept: 'application/vnd.allegro.public.v2+json',
              'accept-language': 'pl-PL',
              'content-type': 'application/vnd.allegro.public.v2+json',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-site'
            },
            referrer: `https://allegro.pl/transaction-front/app/user/purchase/${transactionId}/dapf`,
            referrerPolicy: 'no-referrer-when-downgrade',
            body: `{"paymentId":"${paymentId}"}`,
            method: 'POST',
            mode: 'cors'
          });
        } catch (err) {
          return {
            result: 'error',
            message: `Failed to fetch finalize POST call`
          };
        }

        return {
          result: 'success',
          message: `Item has been successfuly bought for ${totalPrice} PLN`
        };
      } else {
        // Well, price is meh let's proceed

        return {
          result: 'tooExpensive',
          message: `The price is ${totalPrice} PLN and it sux`
        };
      }
    }, auction);

    return result;
  }

  async authorize() {
    // Go to login page
    await this.page.goto('http://allegro.pl/login/auth');

    // Close popup
    await this.closePopup();

    // Fill login data and submit
    await this.fillloginData(this.user);
  }

  async restart(secondsBeforeRestart) {
    this.log('Restarting bot...');

    await this.wait(1000 * secondsBeforeRestart);
    await this.page.close();
    this.start();
  }

  async init() {
    try {
      await this.openNewIncognitoPage();
      await this.authorize();

      return true;
    } catch (err) {
      this.log(err, 'error');
      await this.restart(30);

      return false;
    }
  }

  async stop() {
    await this.page.close();

    // Remove bot instance from the collection
    AuctionScanner.runningInstances = AuctionScanner.runningInstances.filter(
      inst => inst !== this
    );

    // Was this the last bot running?
    if (!AuctionScanner.runningInstances.length) {
      AuctionScanner.reportTable.display();
      await AuctionScanner.browser.close();
    }
  }

  async attemptToBuy(auction, justCheckThePrice = false) {
    const id = this.auctionIdsMap.get(auction)
      ? this.auctionIdsMap.get(auction)
      : getAuctionIdFromUrl(auction);

    if (justCheckThePrice) {
      this.log(`Let me check the price on auction ${id}...`);
    } else {
      this.log(`Let me snipe down auction ${id}...`);
    }

    let result, message;

    try {
      // This try catch block is just in case something really unexpected happens
      const outcome = await this.createTransaction(
        auction,
        id,
        justCheckThePrice
      );
      result = outcome.result;
      message = outcome.message;
    } catch (err) {
      this.log('Unexpected error caught while attempting to buy');
      this.log(err, 'error');
      await sleep(30000);
      return;
    }

    // If bought or error while trying to buy then push new record to report table
    if (
      result === FetchingResult.BUYING_ERROR ||
      result === FetchingResult.SUCCESSFULY_BOUGHT
    ) {
      AuctionScanner.reportTable.push({
        user: this.user.email,
        status: result,
        buyingTime: new Date().getTime() - this.lastFetchingStarted.getTime(),
        dateStarted: this.dateStarted,
        dateFinished: new Date()
      });
    }

    // Handle what happens next
    switch (result) {
      case FetchingResult.PRICE_CHECKED: {
        return {
          url: auction,
          price: message,
          result: FetchingResult.PRICE_CHECKED
        };
      }

      case FetchingResult.TOO_EXPENSIVE: {
        this.log('Too expensive. ' + message);
        return { result: FetchingResult.TOO_EXPENSIVE };
      }

      case FetchingResult.SUCCESSFULY_BOUGHT: {
        await this.log('Success! ' + message, 'success');

        await this.stop();

        return { result: FetchingResult.SUCCESSFULY_BOUGHT };
      }

      case FetchingResult.BUYING_ERROR: {
        this.log('Error while trying to buy. ' + message, 'error');

        await this.stop();

        return { result: FetchingResult.BUYING_ERROR };
      }

      case FetchingResult.FETCHING_ERROR: {
        this.log('Error while fetching. ' + message, 'error');
        this.log('Restarting in 10...');
        await this.restart(10);

        return { result: FetchingResult.FETCHING_ERROR };
      }
    }
  }

  async scan() {
    while (true) {
      if (AuctionScanner.runningInstances[0] === this) {
        // I'm the leading bot, I need to check if the price is ok
        for (const auction of this.auctions) {
          const { url, price } = await this.attemptToBuy(auction, true);

          if (price <= this.maximalBuyingPrice) {
            if (AuctionScanner.runningInstances.length > 1) {
              this.log('Woaaahh, price is great! I have to notify other bots!');
              this.log(AuctionScanner.toString(true) + ', you there guys?');
            }

            AuctionScanner.urlToBuy = url;
            break;
          } else {
            this.log(`Price on auction ${url} sux (${price} PLN)`);
            const timeToSleep = this.msInterval / this.auctions.length;
            this.log(`Sleeping for ${timeToSleep}...`);
            await sleep(timeToSleep);
          }
        }
      }

      if (AuctionScanner.urlToBuy) {
        this.log(`Hyped. Let's get this!`);
        await this.attemptToBuy(AuctionScanner.urlToBuy);
        break;
      }

      await sleep(100);
    }
  }

  async start() {
    const successfulInit = await this.init();

    if (!successfulInit) return;

    this.scan();
  }

  static toString(skipFirst) {
    let bots = '';
    for (let i = 0; i < AuctionScanner.runningInstances.length; i++) {
      if (i === 0 && skipFirst) continue;

      bots += AuctionScanner.runningInstances[i].user.email;

      if (i !== AuctionScanner.runningInstances.length - 1) {
        bots += ', ';
      }
    }

    return bots;
  }
}

module.exports = AuctionScanner;
