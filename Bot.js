const puppeteer = require('puppeteer');
const getAuctionIdFromUrl = require('./utils/getAuctionIdFromUrl');
const log = require('./utils/log');
const sleep = require('./utils/sleep');
const FetchingResult = require('./enums/FetchingResult');
const ReportTable = require('./ReportTable');

class Bot {
  constructor(auctions, maximalBuyingPrice, user, config) {
    Bot.runningInstances.push(this);

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

    Bot.runningInstances = [];
    Bot.reportTable = new ReportTable();

    Bot.browser = await puppeteer.launch({
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
    const context = await Bot.browser.createIncognitoBrowserContext();

    this.page = await context.newPage();
  }

  async createTransaction(auctionUrl, id) {
    const auction = {
      url: auctionUrl,
      id,
      expectedPrice: this.maximalBuyingPrice,
      buyer: this.user
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
    Bot.runningInstances = Bot.runningInstances.filter(inst => inst !== this);

    // Was this the last bot running?
    if (!Bot.runningInstances.length) {
      Bot.reportTable.display();
      await Bot.browser.close();
    }
  }

  async attemptToBuy(auction) {
    const id = this.auctionIdsMap.get(auction)
      ? this.auctionIdsMap.get(auction)
      : getAuctionIdFromUrl(auction);

    this.log(`Let me snipe auction ${id}...`);

    let result, message;

    try {
      // This try catch block is just in case something really unexpected happens
      const outcome = await this.createTransaction(auction, id);
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
      Bot.reportTable.push({
        user: this.user.email,
        status: result,
        buyingTime: new Date().getTime() - this.lastFetchingStarted.getTime(),
        dateStarted: this.dateStarted,
        dateFinished: new Date()
      });
    }

    // Handle what happens next
    switch (result) {
      case FetchingResult.TOO_EXPENSIVE: {
        this.log('Too expensive. ' + message);
        break;
      }

      case FetchingResult.SUCCESSFULY_BOUGHT: {
        await this.log('Success! ' + message, 'success');

        await this.stop();

        break;
      }

      case FetchingResult.BUYING_ERROR: {
        this.log('Error while trying to buy. ' + message, 'error');

        await this.stop();

        return true;
      }

      case FetchingResult.FETCHING_ERROR: {
        this.log('Error while fetching. ' + message, 'error');
        this.log('Restarting in 10...');
        await this.restart(10);

        return true;
      }
    }
  }

  async scan() {
    while (true) {
      for (const auction of this.auctions) {
        const breakLoop = await this.attemptToBuy(auction);
        if (breakLoop) break;
      }

      this.log(`Sleeping for ${this.msInterval}...`);
      await sleep(this.msInterval);
    }

    this.log('Exiting scanning loop...');
  }

  async start() {
    const successfulInit = await this.init();

    if (!successfulInit) return;

    this.scan();
  }
}

module.exports = Bot;
