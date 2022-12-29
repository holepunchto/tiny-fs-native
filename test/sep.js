const test = require('brittle')
const path = require('path')
const fs = require('../index.js')

test('separator', function (t) {
  t.is(fs.sep, path.sep) // isWin ? '\\' : '/'
})
