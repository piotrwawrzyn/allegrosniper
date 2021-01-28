const FetchingResult = require('../enums/FetchingResult');

module.exports = async page => {
  await page.evaluate(FetchingResult => {
    const payload = {
      headers: {
        buyNow: (url, id, quantity) => {
          return {
            credentials: 'include',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              dpr: '1'
            },
            referrer: url,
            body: `item_id=${id}&guest=1&quantity=${quantity}`,
            method: 'POST'
          };
        },
        purchase: transactionId => {
          return {
            credentials: 'include',
            headers: {
              accept: 'application/vnd.allegro.public.v1+json',
              'content-type': 'application/vnd.allegro.public.v1+json',
              'sec-fetch-site': 'same-site',
              'transaction-type': 'CART'
            },
            referrer: `https://allegro.pl/transaction-front/app/user/purchase/${transactionId}/dapf`,
            body: '{}',
            method: 'PUT',
            mode: 'cors'
          };
        }
      },
      urls: {
        buyNow: 'https://allegro.pl/transaction-entry/buy-now',
        purchase: transactionId =>
          `https://edge.allegro.pl/purchases/${transactionId}/buy-commands/web`
      },
      regex: {
        transactionObject: /window\.\$transactionFrontend = (.*?)<\/script>/g,
        transactionObjectCutLeft: /window\.\$transactionFrontend = /,
        transactionObjectCutRight: /<\/script>/
      },
      FetchingResult
    };

    window.injectedPayload = payload;
  }, FetchingResult);
};
