/* eslint-disable class-methods-use-this */
const { EventEmitter } = require('events');
const debug = require('debug')('sub-processor');

module.exports = class ChildBase extends EventEmitter {
  constructor() {
    super();
    Promise
      .resolve()
      .then(() => this.init())
      .then(() => {
        this.emit('ready');
      })
      .catch((err) => {
        debug(`module init fail, ${err.message}`);
      });
  }

  init() {
    return Promise.resolve();
  }

  handler() {
    throw new Error('module should implemented handler method');
  }

  dispose() {
    return Promise.resolve();
  }
};
