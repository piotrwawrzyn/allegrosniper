const FetchingResult = require('../enums/FetchingResult');

module.exports = async page => {
  await page.evaluate(FetchingResult => {
    const payload = {
      buyNowHeaders: (url, id, quantity) => {
        return {
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
          referrer: url,
          referrerPolicy: 'unsafe-url',
          body: `item_id=${id}&guest=1&quantity=${quantity}`,
          method: 'POST',
          mode: 'cors'
        };
      },
      purchaseHeaders: transactionId => {
        return {
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
        };
      },
      finalizeHeaders: (transactionId, paymentId) => {
        return {
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
        };
      },
      urls: {
        buyNow: 'https://allegro.pl/transaction-entry/buy-now',
        purchase: transactionId =>
          `https://edge.allegro.pl/purchases/${transactionId}/buy-commands/web`,
        finalize: 'https://edge.allegro.pl/payment/finalize'
      },
      FetchingResult
    };

    window.injectedPayload = payload;
  }, FetchingResult);
};
