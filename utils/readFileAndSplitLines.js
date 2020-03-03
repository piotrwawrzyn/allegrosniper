const fs = require('fs');

const readFileAndSplitLines = path => {
  const content = fs.readFileSync(path, { encoding: 'utf-8' });

  const resultArray = content.split(/\r?\n/);

  return resultArray;
};

module.exports = readFileAndSplitLines;
