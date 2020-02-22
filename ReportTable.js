var Table = require('cli-table2');
const chalk = require('chalk');
const FetchingResult = require('./enums/FetchingResult');

const HEADERS = [
  'User',
  'Status',
  'Buying time',
  'Time bot started',
  'Time bot finished'
];

const TO_REPORT = {
  USER: 'user',
  STATUS: 'status',
  BUYING_TIME: 'buyingTime',
  DATE_STARTED: 'dateStarted',
  DATE_FINISHED: 'dateFinished'
};

class ReportTable {
  constructor() {
    this.reportTable = new Table();

    // Prepare headers for table
    const headers = HEADERS.map(el => this.prepareHeader(el));

    // Extract first header because of what input format does cli-table expect
    const firstHeader = headers[0];

    this.reportTable.push({
      [firstHeader]: headers.slice(1)
    });
  }

  prepareHeader(headerString) {
    return chalk.bold.blackBright.dim(headerString);
  }

  prepareRecord(key, value) {
    let displayString = '';

    switch (key) {
      case TO_REPORT.DATE_FINISHED:
      case TO_REPORT.DATE_STARTED: {
        // This record is a date
        // displayString = `${value.getDate()}.${value.getMonth() +
        //   1}.${value.getFullYear()} | ${value.getHours()}:${value.getMinutes()}:${value.getSeconds()}:${value.getMilliseconds()}`;
        displayString = `${value.getHours()}:${value.getMinutes()}:${value.getSeconds()}:${value.getMilliseconds()}`;
        break;
      }

      case TO_REPORT.BUYING_TIME: {
        // This records is number of ms
        displayString = value + ' ms';
        break;
      }

      case TO_REPORT.STATUS: {
        displayString =
          value === FetchingResult.ERROR
            ? chalk.redBright(value)
            : chalk.greenBright(value);
        break;
      }

      default: {
        displayString = value;
      }
    }

    return chalk.whiteBright(displayString);
  }

  display() {
    console.log(this.reportTable.toString());
  }

  push(record) {
    const records = [];

    for (const key in record) {
      if (key === TO_REPORT.USER) continue;
      records.push(this.prepareRecord(key, record[key]));
    }

    this.reportTable.push({
      [this.prepareRecord(TO_REPORT.USER, record.user)]: records
    });
  }
}

module.exports = ReportTable;
