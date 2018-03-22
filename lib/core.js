const { fork } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('sub-processor');
const MSG_TYPES = require('./msgTypes');
const utils = require('./utils');

const timer = utils.createTimer();

module.exports = class Core extends EventEmitter {
  constructor(options = {}) {
    super();
    // 异步进程执行js路径
    this.moduleFullPath = options.moduleFullPath;
    // 任务执行超时时间
    this.timeout = options.timeout || 10 * 1000;
    this.forkOptions = Object.assign({
      execArgv: [],
    }, options.forkOptions);

    if (!this.moduleFullPath) {
      throw new Error('moduleFullPath should not be empty');
    }
    if (!fs.existsSync(this.moduleFullPath)) {
      throw new Error(`moduleFullPath ${this.moduleFullPath} not exist`);
    }

    // 子进程是否准备完毕
    this.ready = false;
    // 子进程正在处理任务的tid
    this.runningTid = null;
    // 调用队列
    this.callStack = [];
    // 调用队列上下文
    this.callMap = {};
    this.process = fork(path.join(__dirname, './slave.js'), {});
    this.send({
      type: MSG_TYPES.INIT,
      data: {
        moduleFullPath: this.moduleFullPath,
      },
    });
    debug(`process created, process id ${this.process.pid}`);
    this.bindEvent();
  }

  bindEvent() {
    this.process.on('message', this.msgHandler.bind(this));
  }

  msgHandler({ type, data, message }) {
    switch (type) {
      case MSG_TYPES.READY:
        this.ready = true;
        this.next();
        break;
      case MSG_TYPES.DONE:
        this.done(data);
        break;
      case MSG_TYPES.ERROR:
        this.emitError(new Error(message));
        break;
      case MSG_TYPES.EEXIT:
        this.emitError(new Error(message));
        this.process.kill();
        break;
      default:
        this.emitError(new Error(`unrecognized handler type ${type}`));
    }
  }

  // 子进程任务完成
  done({ tid, result, err }) {
    timer.stop();
    const obj = this.callMap[tid];
    if (obj) {
      delete this.callMap[tid];
      const { promise } = obj;
      if (err) {
        promise.reject(err);
      } else {
        promise.resolve(result);
      }
    }

    this.runningTid = null;
    this.next();
  }

  // 执行队列中的下一个任务
  next() {
    if (!this.ready || this.runningTid !== null || this.callStack.length === 0) {
      return;
    }

    const tid = this.callStack.shift();
    const obj = this.callMap[tid];
    if (obj) {
      this.runningTid = tid;
      this.send({
        type: MSG_TYPES.RUN,
        data: {
          tid,
          args: obj.args,
        },
      });
      // 设置定时器, 如果时间到了, 直接置为错误的完成状态
      timer.start(() => {
        this.done({
          tid: this.runningTid,
          err: new Error('process handle timeout'),
        });
      }, this.timeout);
    } else {
      this.runningTid = null;
      this.next();
    }
  }

  emitError(err) {
    process.nextTick(() => {
      this.emit('error', err);
    });
  }

  // 向子进程发送信息
  send({ type, data }) {
    this.process.send({ type, data });
  }

  // 执行新参数
  exec(...args) {
    return new Promise((resolve, reject) => {
      const tid = `${Date.now()}${utils.generateId()}`;
      this.callMap[tid] = {
        promise: {
          resolve,
          reject,
        },
        args,
      };
      this.callStack.push(tid);
      this.next();
    });
  }

  // 销毁子进程
  dispose() {
    if (this.ready && !this.process.killed) {
      return new Promise((resolve, reject) => {
        this.process.kill('SIGINT');
        this.process.on('exist', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('process exit with error.'));
          }
        });
      });
    }
    return Promise.resolve();
  }
};
