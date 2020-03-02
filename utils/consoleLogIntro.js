const chalk = require('chalk');
const figlet = require('figlet');

const consoleLogIntro = () => {
  console.log(
    figlet.textSync('allegroSniPer', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })
  );
};

module.exports = consoleLogIntro;
