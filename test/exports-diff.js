const test = require('brittle')
const fsnode = require('fs')
const fs = require('../index.js')

test('export differences', function (t) {
  for (const key in fs) {
    if (key === 'sep' || key === '_onfsresponse') continue

    t.is(typeof fs[key], typeof fsnode[key], key + ' is exported')
  }

  for (const key in fsnode) {
    if (!fs[key]) {
      t.comment('missing export: ' + key)
    }
  }
})
