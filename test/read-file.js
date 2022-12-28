const test = require('brittle')
const path = require('path')
const fsnode = require('fs')
const { createFolder } = require('./helpers')
const fs = require('../index.js')
const b4a = require('b4a')

test('read file', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), function (err, data) {
    t.is(err, null)
    t.alike(data, b4a.from('MIT'))
  })
})

test('read file with encoding', function (t) {
  t.plan(4)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), 'utf-8', function (err, data) {
    t.is(err, null)
    t.is(data, 'MIT')
  })

  fs.readFile(path.join(root, 'LICENSE'), 'hex', function (err, data) {
    t.is(err, null)
    t.is(data, b4a.from('MIT').toString('hex'))
  })
})

test('read non-existing file', function (t) {
  t.plan(3)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'not-exists.txt'), function (err, data) {
    t.is(err.errno, -2)
    t.is(err.code, 'ENOENT')
    t.is(data, undefined)
  })
})

test('read file with encoding option', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), { encoding: 'utf-8' }, function (err, data) {
    t.is(err, null)
    t.is(data, 'MIT')
  })
})

test.skip('read file with non-existing encoding', function (t) {
  t.plan(1)

  const root = createFolder(t)

  try {
    // + it's not throwing on same tick, but failing before cb with ERR_UNKNOWN_ENCODING
    fs.readFile(path.join(root, 'LICENSE'), { encoding: 'not-exists' }, function () {
      t.fail('it should not reach callback')
    })
  } catch (error) {
    t.is(error.code, 'ERR_UNKNOWN_ENCODING') // + it should be "ERR_INVALID_ARG_VALUE"
  }
})

test('read file but it is a folder', function (t) {
  t.plan(3)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'examples'), { encoding: 'utf-8' }, function (err, data) {
    // + it should be:
    // Error: EISDIR: illegal operation on a directory

    t.is(err.errno, -21)
    t.is(err.code, 'EUNKNOWN')
    t.is(data, undefined)
  })
})

test('read file with flags', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), { flag: 'w+' }, function (err, data) {
    t.is(err, null)
    t.alike(data, b4a.from('')) // empty means that w+ flags had effect
  })
})

test('read file with no callback', function (t) {
  t.plan(8)

  const root = createFolder(t)

  try {
    fs.readFile()
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }

  try {
    fs.readFile(function () {})
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }

  try {
    fs.readFile(path.join(root, 'LICENSE'))
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }

  try {
    fs.readFile(path.join(root, 'LICENSE'), { flag: 'w+' })
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }
})
