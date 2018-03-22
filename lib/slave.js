const MSG_TYPES = require('./msgTypes');
const debug = require('debug')('sub-processor');

class Slave {
  static start() {
    if (Slave.instance) {
      throw new Error('instance has been created.');
    }
    Slave.instance = new Slave();
  }

  constructor() {
    this.ModuleClass = null;
    this.moduleClassInstance = null;
    this.moduleFullPath = '';
    this.idle = true;
    this.bindEvent();
  }

  bindEvent() {
    process.on('message', this.msgHandler.bind(this));
    process.on('uncaughtException', this.errorHandler.bind(this));
    process.on('unhandledRejection', this.errorHandler.bind(this));
    process.on('SIGINT', () => {
      Promise
        .resolve()
        .then(() => {
          if (this.moduleClassInstance) {
            return this.moduleClassInstance.dispose();
          }
        })
        .then(() => {
          debug('subprocess killed');
          process.exit();
        })
        .catch((err) => {
          debug(`subprocess killed with error ${err.message}`);
          process.exit(1);
        });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  send({ type, data = null, message = '' }) {
    if (!type) {
      throw new Error('send type should not be null.');
    }

    process.send({ type, data, message });
  }

  msgHandler({ type, data }) {
    switch (type) {
      case MSG_TYPES.INIT:
        this.moduleFullPath = data.moduleFullPath;
        this.loadModule(data.moduleInitArgs);
        break;
      case MSG_TYPES.RUN:
        this.run(data);
        break;
      default:
        this.send({
          type: MSG_TYPES.ERROR,
          message: `unrecognized handler type ${type}`,
        });
    }
  }

  errorHandler(err) {
    this.send({
      type: MSG_TYPES.ERROR,
      message: `internal error, ${err.message}`,
    });
  }

  loadModule(initArgs) {
    try {
      this.ModuleClass = require(this.moduleFullPath);
      const instance = new this.ModuleClass(initArgs);
      this.moduleClassInstance = instance;
      instance.once('ready', () => {
        this.send({
          type: MSG_TYPES.READY,
        });
      });
    } catch (e) {
      this.send({
        type: MSG_TYPES.EEXIT,
        message: `load module fail, ${e.message}`,
      });
    }
  }

  run({ tid, args }) {
    if (!this.idle) {
      return this.send({
        type: MSG_TYPES.DONE,
        data: {
          tid,
          err: new Error('process is busy.'),
        },
      });
    }

    this.idle = false;
    Promise
      .resolve()
      .then(() => this.moduleClassInstance.handler(...args))
      .then((result) => {
        this.send({
          type: MSG_TYPES.DONE,
          data: { tid, result },
        });
      })
      .catch((err) => {
        this.send({
          type: MSG_TYPES.DONE,
          data: { tid, err },
        });
      })
      .then(() => {
        this.idle = true;
      });
  }
}

Slave.start();
