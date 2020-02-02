const User = require('./User');
const fs = require('fs');

const users = [];

const usersRecords = fs.readFileSync('users.txt', { encoding: 'utf-8' });

const usersRecordsArray = usersRecords.split('\n');

usersRecordsArray.forEach(function(record) {
  const userInfo = record.split(':');
  const newUser = new User(userInfo[0], userInfo[1]);
  users.push(newUser);
});

module.exports = users;
