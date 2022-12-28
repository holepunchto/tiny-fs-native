const test = require('brittle')
const path = require('path')
const fsnode = require('fs')
const fs = require('../index.js')

test('constants', function (t) {
  for (const key in fs.constants) {
    t.is(fs.constants[key], fsnode.constants[key], key + ' is exported')
  }

  for (const key in fsnode.constants) {
    if (!fs.constants[key]) {
      t.comment('missing constant: ' + key)
    }
  }
})
