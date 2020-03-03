const User = require('./User');
const readFileAndSplitLines = require('./utils/readFileAndSplitLines');
const trimEach = require('./utils/trimEach');

const users = [];

const usersRecordsArray = trimEach(readFileAndSplitLines('users.txt'));

usersRecordsArray.forEach(function(record) {
  const userInfo = record.split(':');
  const newUser = new User(userInfo[0], userInfo[1]);
  users.push(newUser);
});

module.exports = users;
