const test = require('brittle')
const path = require('path')
const fsnode = require('fs')
const { createFolder } = require('./helpers')
const fs = require('../index.js')
const b4a = require('b4a')

test('write file', function (t) {
  t.plan(4)

  const root = createFolder(t)
  const filename = path.join(root, 'NEW-LICENSE')

  fs.writeFile(filename, b4a.from('ISC'), function (err) {
    t.is(err, null)
    t.alike(fsnode.readFileSync(filename), b4a.from('ISC'))
  })

  t.absent(fsnode.existsSync(filename))

  setImmediate(() => {
    t.alike( fsnode.readFileSync(filename), b4a.from('ISC'))
  })
})

test('write file with encoding', function (t) {
  t.plan(4)

  const root = createFolder(t)

  fs.writeFile(path.join(root, 'NEW-LICENSE'), 'ISC', 'utf-8', function (err) {
    t.is(err, null)
    t.alike(fsnode.readFileSync(path.join(root, 'NEW-LICENSE')), b4a.from('ISC'))
  })

  fs.writeFile(path.join(root, 'ANOTHER-NEW-LICENSE'), b4a.from('ISC').toString('hex'), 'hex', function (err) {
    t.is(err, null)
    t.alike(fsnode.readFileSync(path.join(root, 'ANOTHER-NEW-LICENSE')), b4a.from('ISC'))
  })
})

test('write file that already exists', function (t) {
  t.plan(3)

  const root = createFolder(t)

  fs.writeFile(path.join(root, 'LICENSE'), 'ISC', function (err) {
    t.is(err, null)
    t.alike(fsnode.readFileSync(path.join(root, 'LICENSE')), b4a.from('ISC'))
  })
})

test('write file with encoding option', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.writeFile(path.join(root, 'NEW-LICENSE'), b4a.from('ISC').toString('hex'), { encoding: 'hex' }, function (err) {
    t.is(err, null)
    t.alike(fsnode.readFileSync(path.join(root, 'NEW-LICENSE')), b4a.from('ISC'))
  })
})

test('read file with non-existing encoding', function (t) {
  t.plan(1)

  const root = createFolder(t)

  try {
    fs.writeFile(path.join(root, 'NEW-LICENSE'), 'ISC', { encoding: 'not-exists' }, function () {
      t.fail('callback should not be called')
    })
  } catch (error) {
    t.is(error.code, 'ERR_UNKNOWN_ENCODING') // + it should be "ERR_INVALID_ARG_VALUE"
  }
})

// + abort (core dumped)
test.skip('write file with an object', function (t) {
  t.plan(1)

  const root = createFolder(t)

  try {
    fs.writeFile(path.join(root, 'NEW-LICENSE'), { message: 'hello' }, function () {
      t.fail('callback should not be called')
    })
  } catch (error) {
    t.is(error.code, 'ERR_INVALID_ARG_TYPE')
  }
})

test('write file but it is a folder', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.writeFile(path.join(root, 'examples'), 'ISC', function (err) {
    // + it should be:
    // Error: EISDIR: illegal operation on a directory

    t.is(err.errno, -21)
    t.is(err.code, 'EUNKNOWN')
  })
})

test('write file with flags', function (t) {
  t.plan(2)

  const root = createFolder(t)

  fs.writeFile(path.join(root, 'LICENSE'), '+ISC', { flag: 'a+' }, function (err) {
    t.is(err, null)
    t.alike(fsnode.readFileSync(path.join(root, 'LICENSE')), b4a.from('MIT+ISC'))
  })
})

test.solo('write file with no callback', function (t) {
  t.plan(8)

  const root = createFolder(t)

  try {
    fs.writeFile()
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }

  try {
    fs.writeFile(function () {})
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }

  try {
    fs.writeFile(path.join(root, 'LICENSE'))
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }

  try {
    fs.writeFile(path.join(root, 'LICENSE'), { flag: 'w+' })
  } catch (error) {
    t.ok(error.message.startsWith('Callback must be a function'))
    t.is(error.code, 'ERR_INVALID_CALLBACK')
  }
})
