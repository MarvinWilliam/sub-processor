# sub-processor
[![Build Status](https://travis-ci.org/MarvinWilliam/sub-processor.svg?branch=master)](https://travis-ci.org/MarvinWilliam/sub-processor)
[![codecov](https://codecov.io/gh/MarvinWilliam/sub-processor/branch/master/graph/badge.svg)](https://codecov.io/gh/MarvinWilliam/sub-processor)

[![NPM](https://nodei.co/npm/sub-processor.png)](https://nodei.co/npm/sub-processor/)

## Installation
```npm
npm install --save sub-processor
```

## Example
```javascript
// sub.js
// 建议这个包引用node_modules中的一些cpu密集型处理任务
const { Base } = require('sub-processor');
module.exports = class Sub extends Base {
  handler(arg1, arg2) {
    // do something and return with promise or return directly  
  }
};
```

```javascript
const { Processor } = require('sub-processor');
const processor = new Processor({moduleFullPath: `fullPathToModule/sub.js`});

processor.on('error', (err) => {
  // do something
});

processor
  .exec(arg1, arg2)
  .then((result) => {
    // result of running sub.js 
  })
  .catch((err) => {
    // running errored
  })
  .then(() => processor.dispose());
```

## Document
### class Base
异步执行的包需要继承于该基类,基类提供一些基础方法

**instance method**
* init():Promise\<void\> 如果需要在执行之前先异步初始化一些内容,覆盖该方法并返回promise, 外部调用将会等到promise执行完成之后再进行.
* handler():Promise\<*\> 主方法,执行的业务逻辑放在这里,返回结果异步同步都可以.
* dispose():Promise\<void\> 外部dispose时,会向子进程发送SIGINT信号,并调用该方法,如果有需要异步处理的关闭操作,覆盖该方法,并返回promise.

### class Processor

* constructor(\[options\]) 实例方法
   * options.moduleFullPath `string` 执行脚本的完整路径
   * options.timeout `number` (default: 10 * 1000) 单次执行超时时间
   * options.forkOptions  `object` (default: {}) child_process.fork的options
 
**instance method**
 * exec(...args):Promise\<*\> 异步调用包,这里传递的args将会以相同的方式传递给脚本的handler方法
 * dispose():Promise\<void\> 销毁当前子进程
