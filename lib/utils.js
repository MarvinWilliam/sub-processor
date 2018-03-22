/**
 * @return {string}
 */
exports.generateId = () => {
  const str = `000000${Math.floor(Math.random() * 100000)}`;
  return str.slice(str.length - 6, str.length);
};

/**
 * @return {object}
 * @property {function} start
 * @property {function} end
 */
exports.createTimer = () => {
  // eslint-disable-next-line no-underscore-dangle
  let _timer;
  return {
    start: (calbak, time) => {
      _timer = setTimeout(() => {
        calbak();
      }, time);
    },
    stop: () => {
      clearTimeout(_timer);
    },
  };
};
