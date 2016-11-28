'use strict';
// Note that this is called from PhantomJS
// and does not have access to node modules

var system = require('system');
var fs = require('fs');

function collectCoverage(page) {
  // istanbul stores coverage in global.__coverage__
  var coverage = page.evaluate(function() {
    return window.__coverage__;
  });

  // fail gracefully when we don't have coverage
  if (!coverage) {
    return;
  }

  // read coverageFile from mocha-phantomjs args
  var phantomOpts = JSON.parse(system.args[system.args.length-1]);
  var coverageFile = phantomOpts.coverageFile || 'coverage/coverage.json';

  // write coverage to file
  var json = JSON.stringify(coverage);
  fs.write(coverageFile, json);

  // add lcov support
  var lcovFile = phantomOpts.lcovFile || phantomOpts.settings.lcovFile;
  if (lcovFile) {
    console.log("Writing lcov file: ", lcovFile);
    fs.write(lcovFile, getLcov(coverage));
  }
}

// Export lcov format info
// see http://gotwarlost.github.io/istanbul/public/apidocs/files/lib_report_lcovonly.js.html
function getLcov(coverage) {

  var output = '';
  var fprintln = function (s) {
    output += s + '\n';
  }

  for (var f in coverage) {
    console.log("Coverage report for:", f);
    var fc = coverage[f];
    fprintln('TN:'); //no test name
    fprintln('SF:' + fc.path);

    var functions = fc.f,
        functionMap = fc.fnMap,
        lines = fc.l,
        branches = fc.b,
        branchMap = fc.branchMap;

    if (functions) {
      Object.keys(functions).forEach(function (key) {
          var meta = functionMap[key];
          fprintln('FN:' + [ meta.line, meta.name ].join(','));
      });
    }

    if (lines) {
      Object.keys(lines).forEach(function (key) {
          var stat = lines[key];
          fprintln('DA:' + [ key, stat ].join(','));
      });
      // writer.println('LF:' + summary.lines.total);
      // writer.println('LH:' + summary.lines.covered);
    }

    if (branches) {
        Object.keys(branches).forEach(function (key) {
            var branchArray = branches[key],
                meta = branchMap[key],
                line = meta.line,
                i = 0;
            branchArray.forEach(function (b) {
                fprintln('BRDA:' + [line, key, i, b].join(','));
                i += 1;
            });
        });
    }

    fprintln('end_of_record');
  }

  return output;
}

// beforeStart and afterEnd hooks for mocha-phantomjs
module.exports = {
  afterEnd: function(runner) {
    collectCoverage(runner.page);
  }
};
