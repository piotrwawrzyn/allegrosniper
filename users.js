const User = require('./User');
const readFileAndSplitLines = require('./utils/readFileAndSplitLines');
const trimEach = require('./utils/trimEach');

const users = [];

const usersRecordsArray = trimEach(readFileAndSplitLines('users.txt'));

usersRecordsArray.forEach(record => {
  const userInfo = record.split(':');

  if (
    userInfo.length === 2 &&
    userInfo[0].trim() !== '' &&
    userInfo[1].trim() !== ''
  ) {
    const newUser = new User(userInfo[0], userInfo[1]);
    users.push(newUser);
  }
});

module.exports = users;
