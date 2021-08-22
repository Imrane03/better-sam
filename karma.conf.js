module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'browserify'],
    // You may use 'ChromeCanary', 'Chromium' or any other supported browser
    browsers: ['ChromeHeadless', 'Chrome_without_security'],
    browserDisconnectTimeout: 1000,
    // Need to bump these really high as it times out somehow.
    browserDisconnectTolerance: 2,
    browserNoActivityTimeout: 300000,
    // you can define custom flags
    customLaunchers: {
      Chrome_without_security: {
        base: 'ChromeHeadless',
        flags: ['--disable-web-security']
      }
    },
    files: [
      'test/minimum-tests.spec.js',
      'src/**/*.es6',
      // fixtures
      'test/**/*.json',
      {pattern: 'test/**/*-testcase.js', include: false, serve: false, watch: true}
    ],
    exclude: [
    ],
    client: {
      mocha: {
        require: [
        ],
      }
    },
    reporters: ['progress', 'mocha'],
    mochaReporter: {
      output: 'minimal',
      showDiff: true
    },
    preprocessors: {
      'src/**/*.es6': ['browserify', 'sourcemap'],
      'test/**/*.spec.js': ['browserify', 'sourcemap'],
      'test/**/*-testcase.js': ['browserify', 'sourcemap']
    },
    babelPreprocessor: {
      options: {
        sourceMap: 'inline'
      }
    },
    browserify: {
      debug: true,
      transform: [
        'babelify'
      ]
    }
  });
};
