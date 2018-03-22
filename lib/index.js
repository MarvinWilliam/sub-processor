const Core = require('./core');
const { EventEmitter } = require('events');

const PROCESSOR = Symbol('PROCESSOR');

module.exports = class Processor extends EventEmitter {
  constructor(...args) {
    super();
    this[PROCESSOR] = new Core(...args);
    this[PROCESSOR].emit = this.emit;
  }

  exec(...args) {
    return this[PROCESSOR].exec(...args);
  }

  dispose() {
    return this[PROCESSOR].dispose();
  }
};
