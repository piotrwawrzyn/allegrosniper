const puppeteer = require('puppeteer');
const getAuctionIdFromUrl = require('./utils/getAuctionIdFromUrl');
const log = require('./utils/log');
const sleep = require('./utils/sleep');
const FetchingResult = require('./enums/FetchingResult');
const ReportTable = require('./ReportTable');
const injectPayloadToPage = require('./utils/injectPayloadToPage');

class AuctionScanner {
  constructor(auctions, user, config) {
    AuctionScanner.runningInstances.push(this);

    const {
      priceCheckIntervalMs,
      quantityPerAccount,
      maximalBuyingPrice
    } = config;

    this.auctions = auctions;
    this.maximalBuyingPrice = maximalBuyingPrice;
    this.user = user;
    this.priceCheckIntervalMs = priceCheckIntervalMs;
    this.quantityPerAccount = quantityPerAccount;
    this.dateStarted = new Date();

    this.auctionUrlToIdMap = new Map();

    for (const auctionUrl of this.auctions) {
      this.auctionUrlToIdMap.set(auctionUrl, getAuctionIdFromUrl(auctionUrl));
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
    const popupCloseButton = await this.getElementByText(
      'button',
      'Ok, zgadzam się'
    );

    if (popupCloseButton) {
      this.log('Closing popup...');
      await popupCloseButton.click();
    }
  }

  async goToUrl(url) {
    this.log('Opening auction...');
    await this.page.goto(url);
  }

  /*   async fillFirstFound(selectors, text) {
    for (const sel of selectors) {
      try {
        await this.page.type(sel, text);
      } catch (err) {
        this.log(`Selector ${sel} not found.`);
      }
    }
  } */

  async fillInput(selector, text) {
    try {
      await this.page.type(selector, text);
    } catch (err) {
      this.log(`Selector ${selector} not found.`);
    }
  }

  async fillLoginData(user) {
    this.log('Filling login form...');

    await this.fillInput('#login', user.email);
    await this.fillInput('#password', user.password);

    const loginButton = await this.getElementByText('button', 'Zaloguj się');
    await loginButton.click();

    await this.wait();
  }

  async openNewIncognitoPage() {
    this.log('Opening new incognito tab');
    const context = await AuctionScanner.browser.createIncognitoBrowserContext();

    this.page = await context.newPage();
  }

  async createTransaction(auctionUrl, auctionId, justCheckThePrice) {
    const auction = {
      url: auctionUrl,
      id: auctionId,
      expectedPrice: this.maximalBuyingPrice,
      buyer: this.user,
      justCheckThePrice,
      quantity: this.quantityPerAccount
    };

    this.lastFetchingStarted = new Date();

    /* Everything below in this function happens in the browsers console */

    const result = await this.page.evaluate(async auction => {
      let response;

      const { headers, urls, FetchingResult } = injectedPayload;

      try {
        response = await fetch(
          urls.buyNow,
          headers.buyNow(auction.url, auction.id, auction.quantity)
        );
      } catch (err) {
        return {
          result: FetchingResult.BUYING_ERROR,
          message: `Failed to fetch buy-now POST call`
        };
      }

      const data = await response.text();

      const result = data.match(
        /window\.\$transactionFrontend = (.*?)<\/script>/g
      );

      if (result === null) {
        if (auction.justCheckThePrice) {
          return { result: FetchingResult.PRICE_CHECKED, message: 'null' };
        }

        return {
          result: FetchingResult.BUYING_ERROR,
          message: `Can't parse auction price because no JSON has been found!`
        };
      }

      const jsonStringToParse = result[0]
        .replace(/window\.\$transactionFrontend = /, '')
        .replace(/<\/script>/, '');

      const transactionObject = JSON.parse(jsonStringToParse);

      if (!transactionObject) {
        return {
          result: FetchingResult.BUYING_ERROR,
          message: `Transaction object is null or undefined`
        };
      }

      if (!transactionObject.purchase.orders) {
        return {
          result: FetchingResult.BUYING_ERROR,
          message: `Orders property in transaction object is null or undefined`
        };
      }

      const [order] = transactionObject.purchase.orders;
      const [offer] = order.offers;

      if (!order || !offer) return;

      const totalPrice = offer.totalPrice;

      const pricePerItem = (totalPrice / auction.quantity).toFixed(2);

      if (auction.justCheckThePrice) {
        return { result: FetchingResult.PRICE_CHECKED, message: pricePerItem };
      }

      const timeToBuy = pricePerItem <= auction.expectedPrice;

      if (timeToBuy) {
        const transactionId = transactionObject.purchase.id;
        // let paymentId = transactionObject.purchase.payment.id;

        const { delivery } = order;

        if (!delivery)
          return {
            result: FetchingResult.BUYING_ERROR,
            message: `Delivery method has not been set`
          };

        try {
          await fetch(
            urls.purchase(transactionId),
            headers.purchase(transactionId)
          );
        } catch (err) {
          return {
            result: FetchingResult.BUYING_ERROR,
            message: `Purchase PUT call failed`
          };
        }

        return {
          result: FetchingResult.SUCCESSFULY_BOUGHT,
          message: `${auction.quantity}x Item has been successfuly bought for ${pricePerItem} PLN`
        };
      } else {
        return {
          result: FetchingResult.TOO_EXPENSIVE,
          message: `The price is ${pricePerItem} PLN and it sux`
        };
      }
    }, auction);

    return result;
  }

  async authorize() {
    const authUrl = 'http://allegro.pl/login/auth';

    await this.page.goto(authUrl);
    await this.page.waitFor(1000);
    await this.closePopup();
    await this.page.waitFor(1000);
    await this.fillLoginData(this.user);
  }

  async restart(secondsBeforeRestart) {
    this.log(`Restarting bot in ${secondsBeforeRestart} seconds...`);

    await this.wait(1000 * secondsBeforeRestart);
    await this.page.close();
    this.start();
  }

  async init() {
    try {
      await this.openNewIncognitoPage();
      await this.authorize();
      await injectPayloadToPage(this.page);

      return true;
    } catch (err) {
      this.log(err, 'error');
      await this.restart(30);

      return false;
    }
  }

  async removeInstance() {
    AuctionScanner.runningInstances = AuctionScanner.runningInstances.filter(
      inst => inst !== this
    );

    const wasLastInstance = !AuctionScanner.runningInstances.length;

    if (wasLastInstance) {
      AuctionScanner.reportTable.display();
      await AuctionScanner.browser.close();
    }
  }

  async stop() {
    await this.page.close();
    await this.removeInstance();
  }

  async attemptToBuy(auction, justCheckThePrice = false) {
    const auctionId = this.auctionUrlToIdMap.get(auction);
    /*       ? this.auctionUrlToIdMap.get(auction)
      : getAuctionIdFromUrl(auction); */

    if (justCheckThePrice) {
      this.log(`Checking price on auction ${auctionId}...`, 'leader');
    } else {
      this.log(`Buying auction ${auctionId}...`);
    }

    let result, message;

    try {
      const outcome = await this.createTransaction(
        auction,
        auctionId,
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

  logNotification() {
    this.log('Woaaahh, price is great! I have to notify other bots!', 'leader');
    this.log(AuctionScanner.toString(true) + ', you there guys?', 'leader');
  }

  logNotificationResponse() {
    this.log(`Hyped. Let's get this!`);
  }

  async handlePurchase() {
    this.logNotificationResponse();
    const outcome = await this.attemptToBuy(AuctionScanner.urlToBuy);

    let result = null;

    if (outcome) {
      result = outcome.result;
    }

    if (result === FetchingResult.SUCCESSFULY_BOUGHT) {
      return true;
    } else {
      this.log('Unsuccessful purchase with result: ' + result, 'error');
      this.log(`Let's try again`);

      return false;
    }
  }

  async checkPrices(sleepTimePerAuction) {
    for (const auction of this.auctions) {
      const auctionData = await this.attemptToBuy(auction, true);

      if (!auctionData) continue;

      const { url, price } = auctionData;

      if (price <= this.maximalBuyingPrice) {
        if (AuctionScanner.runningInstances.length > 1) {
          this.logNotification();
        }

        AuctionScanner.urlToBuy = url;

        break;
      } else {
        const auctionId = this.auctionUrlToIdMap.get(url);
        this.log(`Price on auction ${auctionId} sux (${price} PLN)`, 'leader');
        this.log(`Sleeping for ${sleepTimePerAuction}...`, 'leader');
        await sleep(sleepTimePerAuction);
      }
    }
  }

  async scan() {
    if (AuctionScanner.runningInstances[0] !== this) {
      this.log('Waiting for the notification from the leader');
    }
    const sleepTimeForAwaitingBotsMs = 50;
    const sleepTimePerAuction = Math.round(
      this.priceCheckIntervalMs / this.auctions.length
    );

    while (true) {
      const isLeadingBot = AuctionScanner.runningInstances[0] === this;
      const isReadyToPurchase = !!AuctionScanner.urlToBuy;

      if (isReadyToPurchase) {
        const success = await this.handlePurchase();

        if (success) break;

        continue;
      } else if (isLeadingBot) {
        await this.checkPrices(sleepTimePerAuction);
      } else {
        await sleep(sleepTimeForAwaitingBotsMs);
      }
    }
  }

  async start() {
    const successfulInit = await this.init();

    if (!successfulInit) return;

    this.scan();
  }

  static toString(skipFirst) {
    let botEmails = '';

    for (let i = 0; i < AuctionScanner.runningInstances.length; i++) {
      if (i === 0 && skipFirst) continue;

      botEmails += AuctionScanner.runningInstances[i].user.email;

      if (i !== AuctionScanner.runningInstances.length - 1) {
        botEmails += ', ';
      }
    }

    return botEmails;
  }
}

module.exports = AuctionScanner;
