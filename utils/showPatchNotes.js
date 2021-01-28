const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');

const VERSIONS = {
  v200: '2.0.0',
  v210: '2.1.0',
  v220: '2.2.0',
  v221: '2.2.1',
  v222: '2.2.2',
  v223: '2.2.3'
};

const patchnotesCookiePath = './cookie';
const currentVersion = VERSIONS.v223;
const patchnotes = {};

const addPatchNote = (patchnote, version) => {
  if (!patchnotes[version]) patchnotes[version] = [];

  patchnote = '\n -> ' + patchnote;
  patchnotes[version].push(patchnote);
};

const addPatchNotes = () => {
  addPatchNote(
    'You can now use many accounts (10+) with no performence losses',
    VERSIONS.v200
  );
  addPatchNote(
    'Bot now uses basic HTTP methods (POST, PUT, GET) to check the price and buy an item',
    VERSIONS.v200
  );
  addPatchNote(
    'Puppeteer (headless browser) is now only used to authenticate and stay in the browser enviroment',
    VERSIONS.v200
  );
  addPatchNote(
    `Bot speed and performance are now increased by over 400%`,
    VERSIONS.v200
  );
  addPatchNote(
    'Console colored messages, patchnotes and ASCII art introduction logo',
    VERSIONS.v200
  );
  addPatchNote(
    `You now don't have to have any payment method selected on the account`,
    VERSIONS.v200
  );
  addPatchNote(
    'A table with report will now appear after all bots finish their jobs',
    VERSIONS.v210
  );
  addPatchNote(
    'You can now scan all auctions from the given seller, check out new option in setup.js',
    VERSIONS.v210
  );
  addPatchNote(
    'Bot now uses just one leading account which checks price instead of scanning with all accounts',
    VERSIONS.v210
  );
  addPatchNote(
    `New feature: scan whole allegro with search query of your choice when you don't know the exact auction`,
    VERSIONS.v220
  );
  addPatchNote(
    `Removed feature: scanning all auctions of chosen seller (wasn't working efficiently because of server side caching)`,
    VERSIONS.v220
  );
  addPatchNote('Fix: Interval will always be an integer now', VERSIONS.v220);
  addPatchNote('Brand new slick logo', VERSIONS.v220);
  addPatchNote(
    'Added safety check to avoid unexpected bot crash',
    VERSIONS.v221
  );
  addPatchNote('Added configurable snipe quantity per account', VERSIONS.v221);
  addPatchNote(
    'Fixed linux incompatibility with new line character splitting',
    VERSIONS.v221
  );
  addPatchNote(
    'Add auctions in the auctions.txt file (not in setup.js) anymore',
    VERSIONS.v221
  );
  addPatchNote(
    `users.txt and auctions.txt are now trimmed so don't be afraid of a whitespace at the end of the line`,
    VERSIONS.v221
  );
  addPatchNote(
    `Removed unstable search by query function and did some minor code refactorings`,
    VERSIONS.v222
  );
  addPatchNote(
    `Code quality improvements and minor optimizations`,
    VERSIONS.v223
  );
};

const displayPatchNotes = () => {
  console.log(
    chalk.yellowBright(`
   ${chalk.underline(`allegrosniper v${currentVersion} patchnotes:`)}
   ${patchnotes[currentVersion]}

  `)
  );
};

const showPatchNotes = () => {
  if (
    fs.existsSync(patchnotesCookiePath) &&
    fs.readFileSync(patchnotesCookiePath, 'utf-8') === currentVersion
  ) {
    return;
  }

  addPatchNotes();
  displayPatchNotes();

  // Wait for user to confirm new patch notes
  const cmdInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const saveCookie = () => {
    fs.writeFileSync(patchnotesCookiePath, currentVersion);
  };

  return new Promise(resolve =>
    cmdInterface.question('Confirm patch notes by clicking enter', () => {
      cmdInterface.close();
      resolve();
    })
  ).then(() => saveCookie());
};

module.exports = showPatchNotes;
