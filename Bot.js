const puppeteer = require('puppeteer');
const desktop = puppeteer.devices['Desktop 1920x1080'];
const saveHtml = require('./utils/saveHtml');
const log = require('./utils/log');
const sleep = require('./utils/sleep');

class Bot {
  constructor(auctions, maximalBuyingPrice, user, config) {
    const { msInterval, saveScreenshots, saveHtmlCode } = config;

    this.auctions = auctions;
    this.maximalBuyingPrice = maximalBuyingPrice;
    this.user = user;
    this.msInterval = msInterval;
    this.saveScreenshots = saveScreenshots;
    this.saveHtmlCode = saveHtmlCode;
  }

  async getElementByText(text) {
    const elements = await this.page.$x(
      `//button[contains(text(), "${text}")]`
    );

    if (elements.length > 0) return elements[0];
    else return null;
  }

  async resetCache() {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.emulate(desktop);
  }

  async wait() {
    this.log('Waiting for navigation...');
    await this.page.waitForNavigation();
  }

  log(message) {
    log(message, this.user);
  }

  async saveSnapshot(title) {
    // Save screenshot
    if (this.saveScreenshots)
      this.page.screenshot({ path: `screenshots/${title}.png` });

    // Save html code
    if (this.saveHtmlCode) {
      const code = await this.page.content();
      saveHtml(code, title);
    }
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

  async goToAuction(url, counter) {
    this.log('Opening auction...');
    await this.page.goto(url);
    await this.saveSnapshot(`auction_${counter}_opened`);
  }

  async checkThePriceOnAuction() {
    this.log('Checking the price...');

    const selector = '._wtiln';
    const priceString = await this.page.evaluate(
      selector => document.querySelector(selector).innerText,
      selector
    );

    const price = parseInt(priceString);

    this.log(`Price is ${priceString}.`);

    return price;
  }

  async clickBuyNowButton() {
    this.log('Clicking buy now...');
    const buyNowButton = await this.getElementByText('KUP TERAZ');

    await buyNowButton.click();

    await this.wait();
    await this.page.evaluate(_ => {
      window.scrollBy(0, window.innerHeight);
    });
    await this.saveSnapshot('buynow_clicked');
  }

  async fillloginData(user) {
    this.log('Filling login form...');

    await this.page.type('#username', user.email);
    await this.page.type('#password', user.password);
    await this.saveSnapshot('before_login_submit');
    await this.page.click('#login-button');
    await this.wait();
    await this.saveSnapshot('after_login_submit');
  }

  async buyAndPay() {
    this.log('Clicking buy and pay...');

    await this.page.click('#buy-and-pay-btn');
    await this.saveSnapshot('buyandpay_clicked');

    this.log('PURCHASE SUCCESSFUL! :-)');
  }

  async selectPaymentMethod() {
    this.log('Clicking credit card payment method...');
    let elements = await this.page.$x(
      `//p[contains(text(), "karta płatnicza")]`
    );
    await elements[0].click();
    await this.saveSnapshot('credit_card_clicked');
  }

  async selectCreditCard() {
    this.log('Selecting first credit card from the list...');
    await this.page.waitForSelector('[name=creditCard]');
    await this.page.click('[name=creditCard]');
    // await this.page.click(
    //   '.m-choice.m-choice--radio.ng-pristine.ng-untouched.ng-valid.ng-not-empty.ng-valid-required'
    // );
    await this.saveSnapshot('credit_card_selected');
  }

  async initializeBrowserEnvironment() {
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();
    await this.page.emulate(desktop);
  }

  async authorize() {
    // Go to login page
    await this.page.goto('http://allegro.pl/login/auth');

    // Close popup
    await this.closePopup();

    // Fill login data and submit
    await this.fillloginData(this.user);

    await this.saveSnapshot('login_page');
  }

  async start() {
    await this.initializeBrowserEnvironment();
    await this.authorize();

    while (true) {
      try {
        let i = 1;
        for (const url of this.auctions) {
          await this.goToAuction(url, i++);

          const price = await this.checkThePriceOnAuction();

          if (price <= this.maximalBuyingPrice) {
            this.log(`Price is GOOD, time to make some shopping!`); // (${url})

            await this.clickBuyNowButton();

            await this.selectPaymentMethod();
            await this.selectCreditCard();
            await this.buyAndPay();
            // await this.browser.close();
            return;
          } else {
            this.log(`Price is BAD `); // (${url})
          }
        }
      } catch (err) {
        console.log(err);
      } finally {
        this.log(`Sleeping for ${this.msInterval}`);
        await sleep(this.msInterval);
      }
    }
  }
}

module.exports = Bot;
