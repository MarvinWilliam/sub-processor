const chai = require('chai');
const sinon = require('sinon');
const proxyRequire = require('proxyquire');
const path = require('path');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

const { expect } = chai;

const MSG_TYPES = require('../../lib/msgTypes');

const moduleFullPath = path.join(__dirname, '../files/testModule.js');
const noop = () => {
};

describe('core', () => {
  const forkedProcess = {
    on: sinon.stub(),
    kill: sinon.stub(),
    send: sinon.stub(),
  };
  const Core = proxyRequire('../../lib/core', {
    'child_process': { fork: () => forkedProcess },
  });

  beforeEach(() => {
    Object
      .keys(forkedProcess)
      .forEach((key) => {
        forkedProcess[key].reset();
      });
  });

  context('config', () => {
    it('no moduleFullPath should throw error', () => {
      expect(() => {
        new Core();
      }).to.throw(Error);
    });

    it('no file on modulePath should throw error', () => {
      expect(() => {
        new Core({ moduleFullPath: path.join(__dirname, '../files/noFile.js') });
      }).to.throw(Error);
    });
  });

  it('modulePath should be send to subprocess', () => {
    new Core({ moduleFullPath });
    expect(forkedProcess.send).to.have.been.calledWith({
      type: MSG_TYPES.INIT,
      data: { moduleFullPath },
    });
  });

  it('exec should return after subprocess is ready', (done) => {
    forkedProcess.on.callsArgWith(1, { type: MSG_TYPES.READY });
    const core = new Core({ moduleFullPath });
    core.exec(1).catch(noop);
    setTimeout(() => {
      expect(forkedProcess.send).to.have.been.calledWith({
        type: MSG_TYPES.RUN,
        data: { tid: core.runningTid, args: [1] },
      });
      done();
    });
  });

  it('process should exit if get eexit error', (done) => {
    forkedProcess.on.callsArgWith(1, { type: MSG_TYPES.EEXIT, message: '' });
    const spy = sinon.spy();
    const core = new Core({ moduleFullPath });
    core.on('error', spy);
    setTimeout(() => {
      expect(forkedProcess.kill).to.have.been.called;
      expect(spy).to.have.been.called;
      done();
    }, 1000);
  });

  it('error message should throw out', (done) => {
    forkedProcess.on.callsArgWith(1, { type: MSG_TYPES.ERROR, message: 'test' });
    const spy = sinon.spy();
    const core = new Core({ moduleFullPath });
    core.on('error', spy);
    setTimeout(() => {
      expect(spy).to.have.been.called;
      done();
    }, 1000);
  });

  it('unrecognized type should throw error', (done) => {
    forkedProcess.on.callsArgWith(1, { type: 'test' });
    const spy = sinon.spy();
    const core = new Core({ moduleFullPath });
    core.on('error', spy);
    setTimeout(() => {
      expect(spy).to.have.been.called;
      done();
    }, 1000);
  });

  it('subprocess finished should be fulfilled', () => {
    const result = { a: 1 };
    let core;
    forkedProcess.send.callsFake(({ type, data }) => {
      if (type === MSG_TYPES.INIT) {
        forkedProcess.on.withArgs('message').callsArgWith(1, { type: MSG_TYPES.READY });
      }
      if (type === MSG_TYPES.RUN) {
        core.msgHandler({ type: MSG_TYPES.DONE, data: { tid: data.tid, result } });
      }
    });
    core = new Core({ moduleFullPath });
    return expect(core.exec(1)).to.eventually.equal(result);
  });

  context('dispose', () => {
    it('subprocess is not ready, should be fulfilled', () => {
      const core = new Core({ moduleFullPath });
      expect(core.ready).to.be.equal(false);
      expect(core.dispose()).to.be.fulfilled;
    });

    it('subprocess is ready, should be fulfilled if subprocess exit success', () => {
      forkedProcess.on.withArgs('message').callsArgWith(1, { type: MSG_TYPES.READY });
      forkedProcess.on.withArgs('exist').callsArgWith(1, 0);
      const core = new Core({ moduleFullPath });
      expect(core.dispose()).to.be.fulfilled;
    });

    it('subprocess is ready, should be rejected if subprocess exit failed', () => {
      forkedProcess.on.withArgs('message').callsArgWith(1, { type: MSG_TYPES.READY });
      forkedProcess.on.withArgs('exist').callsArgWith(1, 1);
      const core = new Core({ moduleFullPath });
      expect(core.dispose()).to.be.rejected;
    });
  });
});
