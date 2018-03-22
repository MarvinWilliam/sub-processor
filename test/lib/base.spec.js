const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

const { expect } = chai;

const Base = require('../../lib/base');

describe('base', () => {
  context('ready event', () => {
    it('emit ready after create new instance', () => {
      const spy = sinon.spy();
      const b = new Base();
      b.on('ready', spy);
      setTimeout(() => {
        expect(spy).to.have.been.called;
      }, 1000);
    });

    it('should call subclass init function', () => {
      const stub = sinon.stub();

      class Sub extends Base {
        init() {
          return stub.resolves();
        }
      }

      const s = new Sub();
      s.on('ready', () => {
        expect(stub).to.have.been.called;
      });
    });
  });

  it('direct call handler should throw error', () => {
    const b = new Base();
    expect(() => {
      b.handler();
    }).to.throw(Error);
  });

  it('dispose call should return promise', () =>
    expect(new Base().dispose()).to.be.fulfilled);
});
