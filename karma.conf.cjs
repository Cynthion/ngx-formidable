// The demo's suite renders the whole Studio — twenty-four live fields, a theme written to `:root` and read
// back through the browser — once per portal spec. That is legitimately slow, and Karma's default
// thirty-second inactivity window is close enough to a single spec's cost that a loaded machine
// disconnects the browser mid-run and the suite fails for a reason that has nothing to do with the code.
//
// Supplying a `karmaConfig` means the builder stops contributing its own defaults, so the frameworks and
// plugins it would otherwise inject are declared here. The builder still supplies the files, the bundling
// and the browser.
module.exports = (config) => {
  config.set({
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    reporters: ['progress', 'kjhtml'],
    browserNoActivityTimeout: 180_000,
    browserDisconnectTimeout: 30_000,
    browserDisconnectTolerance: 2,
    pingTimeout: 60_000
  });
};
