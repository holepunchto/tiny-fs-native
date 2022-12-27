const test = require('brittle')
const path = require('path')
const { createFolder } = require('./helpers')
const fs = require('../index.js')
const b4a = require('b4a')

test('read file', function (t) {
  t.plan(1)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), function (err, data) {
    if (err) throw err
    t.alike(data, b4a.from('MIT'))
  })
})

test('read file with encoding', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), 'utf-8', function (err, data) {
    if (err) throw err
    t.is(data, 'MIT')
  })

  fs.readFile(path.join(root, 'LICENSE'), 'utf8', function (err, data) {
    if (err) throw err
    t.is(data, 'MIT')
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
  t.plan(1)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), { encoding: 'utf-8' }, function (err, data) {
    if (err) throw err
    t.is(data, 'MIT')
  })
})

test.skip('read file with non-existing encoding', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), { encoding: 'not-exists' }, function (err, data) {
    t.is(err.code, 'ERR_UNKNOWN_ENCODING')
    t.is(data, undefined)
  })
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
  t.plan(1)

  const root = createFolder(t)

  fs.readFile(path.join(root, 'LICENSE'), { flag: 'w+' }, function (err, data) {
    if (err) throw err
    t.alike(data, b4a.from('')) // empty means that w+ flags had effect
  })
})
