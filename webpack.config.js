const path = require('path');

module.exports = {
  // 其他webpack配置...
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
      url: require.resolve('url/'),
      vm: require.resolve('vm-browserify'),
      process: require.resolve('process/browser'),
    },
  }
}; 