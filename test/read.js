const test = require('brittle')
const path = require('path')
const fsnode = require('fs')
const { createFolder, makeBuffer } = require('./helpers')
const fs = require('../index.js')
const b4a = require('b4a')

test('read', function (t) {
  t.plan(4)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(32)

  fs.read(fd, buffer, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, 3)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'MIT'))
    t.ok(buffer === chunk)

    fsnode.closeSync(fd)
  })
})

test('read with options', function (t) {
  t.plan(3)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(32)
  const bytesToRead = buffer.byteLength

  fs.read(fd, buffer, 0, bytesToRead, 0, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, 3)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'MIT'))

    fsnode.closeSync(fd)
  })
})

test('read with offset', function (t) {
  t.plan(3)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(32)
  const offset = 10
  const bytesToRead = buffer.byteLength - offset

  fs.read(fd, buffer, offset, bytesToRead, 0, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, 3)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'MIT', offset))

    fsnode.closeSync(fd)
  })
})

test('read with length', function (t) {
  t.plan(3)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(32)
  const length = 1

  fs.read(fd, buffer, 0, length, 0, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, length)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'M'))

    fsnode.closeSync(fd)
  })
})

test('read with position', function (t) {
  t.plan(9)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(32)
  const bytesToRead = buffer.byteLength
  const length = 1
  let position = 0

  fs.read(fd, buffer, 0, length, position++, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, length)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'M'))

    fs.read(fd, buffer, 0, length, position++, function (err, bytesRead, chunk) {
      t.is(err, null)
      t.is(bytesRead, length)
      t.alike(chunk, makeBuffer(buffer.byteLength, 'I'))

      fs.read(fd, buffer, 0, length, position++, function (err, bytesRead, chunk) {
        t.is(err, null)
        t.is(bytesRead, length)
        t.alike(chunk, makeBuffer(buffer.byteLength, 'T'))

        fsnode.closeSync(fd)
      })
    })
  })
})

test('read with automatic position', function (t) {
  t.plan(9)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(1)
  const bytesToRead = buffer.byteLength

  fs.read(fd, buffer, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, bytesToRead)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'M'))

    fs.read(fd, buffer, function (err, bytesRead, chunk) {
      t.is(err, null)
      t.is(bytesRead, bytesToRead)
      t.alike(chunk, makeBuffer(buffer.byteLength, 'I'))

      fs.read(fd, buffer, function (err, bytesRead, chunk) {
        t.is(err, null)
        t.is(bytesRead, bytesToRead)
        t.alike(chunk, makeBuffer(buffer.byteLength, 'T'))

        fsnode.closeSync(fd)
      })
    })
  })
})

test('read with automatic position if specifying -1 or null', function (t) {
  t.plan(9)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(1)
  const bytesToRead = buffer.byteLength

  fs.read(fd, buffer, 0, bytesToRead, -1, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, bytesToRead)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'M'))

    fs.read(fd, buffer, 0, bytesToRead, null, function (err, bytesRead, chunk) {
      t.is(err, null)
      t.is(bytesRead, bytesToRead)
      t.alike(chunk, makeBuffer(buffer.byteLength, 'I'))

      fs.read(fd, buffer, 0, bytesToRead, -1, function (err, bytesRead, chunk) {
        t.is(err, null)
        t.is(bytesRead, bytesToRead)
        t.alike(chunk, makeBuffer(buffer.byteLength, 'T'))

        fsnode.closeSync(fd)
      })
    })
  })
})

test('read with automatic position, later manual position, and back to automatic position', function (t) {
  t.plan(9)

  const root = createFolder(t)

  const fd = fsnode.openSync(path.join(root, 'LICENSE'))
  const buffer = b4a.alloc(1)
  const bytesToRead = buffer.byteLength

  fs.read(fd, buffer, function (err, bytesRead, chunk) {
    t.is(err, null)
    t.is(bytesRead, bytesToRead)
    t.alike(chunk, makeBuffer(buffer.byteLength, 'M'))

    fs.read(fd, buffer, 0, bytesToRead, 1, function (err, bytesRead, chunk) {
      t.is(err, null)
      t.is(bytesRead, bytesToRead)
      t.alike(chunk, makeBuffer(buffer.byteLength, 'I'))

      fs.read(fd, buffer, function (err, bytesRead, chunk) {
        t.is(err, null)
        t.is(bytesRead, bytesToRead)
        t.alike(chunk, makeBuffer(buffer.byteLength, 'I'))

        fsnode.closeSync(fd)
      })
    })
  })
})
