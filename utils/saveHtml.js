const fs = require('fs');
module.exports = saveHtml = (htmlCode, title) => {
  fs.writeFileSync(`htmlCode/${title}.html`, htmlCode);
};
