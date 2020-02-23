const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');

const VERSIONS = {
  v200: '2.0.0',
  v210: '2.1.0'
};

const patchnotesCookiePath = './cookie';
const currentVersion = VERSIONS.v210;
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
    cmdInterface.question('Confirm patch notes by clicking any key', () => {
      cmdInterface.close();
      resolve();
    })
  ).then(() => saveCookie());
};

module.exports = showPatchNotes;
