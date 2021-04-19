# allegrosniper

CLI bot that will buy you an item from [allegro.pl](https://allegro.pl) as soon as it reaches your desired price.

![allegrosniper preview image](https://user-images.githubusercontent.com/42513971/82207666-81863380-990a-11ea-96a7-9ec1c6185c0b.png)

## Features

- Supports multiple accounts
- Supports scanning many auctions simultaneously
- Uses headless browser activly only for authorization purposes
- Uses bare-bones http requests for price fetching / buying process
- Super fast buyer, optimized to buy an item in 1x PUT and 1x POST calls
- Displays a summary table at the end
- Highly configurable
- Works on both Linux and Windows

## Installation

1. Clone the repo <br><br>`git clone https://github.com/piotrwawrzyn/allegrosniper.git`<br>

2. Move to the project directory <br><br>`cd allegrosniper`<br>

3. Install dependencies <br><br>`npm install`<br>

## Setup

1. Create `users.txt` file in the project root directory

2. Fill the `users.txt` file with your accounts in format `email:password` / `username:password`. Split every account with a new line character

```
    user1@gmail.com:password1
    user2@gmail.com:password2
    user3@gmail.com:password3
```

3. Create `auctions.txt` file in the project root directory

4. In the `auctions.txt` file paste a URL to the auction or auctions you want the bot to watch. Split every auction URL with a new line character

```
    https://allegro.pl/oferta/something-something-something-12345678
    https://allegro.pl/oferta/something-else-87654321
```

5. Review `config.js` file and modify it respectively to your needs
<table>
	<tr><th>Property</th><th>Type</th><th>Description</th></tr>
	<tr><td><code>quantityPerAccount</code></td><td>number</td><td>How much of this item should a single account try to buy?</td></tr>
	<tr><td><code>maximalBuyingPrice</code></td><td>number</td><td>If price on the auction will be equal or less than this value bot will try to purchase</td></tr>
	<tr><td><code>priceCheckIntervalMs</code></td><td>number</td><td>How often do you want the bot to check the price in milliseconds
	<br><br>
	<strong>Request rate formula:</strong> 1x http request every <code>priceCheckIntervalMs</code> per 1 auction in <code>auctions.txt</code> file
	</td></tr>
	<tr><td><code>accountsToUseCount</code></td><td>number</td><td>How many of your accounts from <code>accounts.txt</code> file do you want to use?
	<br><br>
	<strong>Tip:</strong> With value of -1 will use all available accounts</td></tr>
	<tr><td><code>headless</code></td><td>boolean</td><td>Whether to run the browser in the headless mode or not. Use false only when debugging</td></tr>
</table>

## Usage

After setup all what's left is to run the start command.

`npm run start`
