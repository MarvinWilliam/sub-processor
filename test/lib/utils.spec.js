const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { expect } = chai;

const utils = require('../../lib/utils');

describe('utils', () => {
  context('generateId', () => {
    it('should return a string length of 6', () => {
      const id = utils.generateId();
      expect(id).to.be.a('string');
      expect(id).to.have.lengthOf(6);
    });
  });

  context('createTimer', () => {
    it('should return with object', () => {
      expect(utils.createTimer()).to.be.an('object');
    });

    it('calback should be called after time limit', function (done) {
      this.timeout(5000);
      const timer = utils.createTimer();
      const calbak = sinon.spy();
      timer.start(calbak, 2000);
      setTimeout(() => {
        expect(calbak).to.have.been.calledOnce;
        done();
      }, 3000);
    });

    it('calback should not be called after stop called', function (done) {
      this.timeout(5000);
      const timer = utils.createTimer();
      const calbak = sinon.spy();
      timer.start(calbak, 2000);
      timer.stop();
      setTimeout(() => {
        expect(calbak).to.have.not.been.called;
        done();
      }, 4000);
    });
  });
});
