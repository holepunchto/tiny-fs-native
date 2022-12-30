const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')
const b4a = require('b4a')

const isWin = os.platform() === 'win32'

module.exports = {
  createTmpDir,
  createFolder,
  isWin,
  makeBuffer
}

function createTmpDir (t) {
  const tmpdir = path.join(os.tmpdir(), 'localdrive-test-')
  const dir = fs.mkdtempSync(tmpdir)
  t.teardown(() => fsp.rm(dir, { recursive: true }))
  return dir
}

function createFolder (t, { setup = true } = {}) {
  const root = createTmpDir(t)
  if (setup) generateTestFiles(t, root)

  return root
}

function generateTestFiles (t, root) {
  const fullpath = (name) => path.join(root, name)
  const createFile = (name, content) => fs.writeFileSync(fullpath(name), content)
  const createFolder = (name) => fs.mkdirSync(fullpath(name))

  createFile('README.md', '# example')
  createFile('script.sh', '#!/bin/bash')
  createFile('LICENSE', 'MIT')
  createFile('key.secret', '1234')
  createFile('empty.txt', '')

  createFolder('examples/')
  createFile('examples/a.txt', '1st')
  createFile('examples/b.txt', '2th')

  createFolder('examples/more/')
  createFile('examples/more/c.txt', '3rd')
  createFile('examples/more/d.txt', '4th')

  createFolder('solo/')
  createFile('solo/one.txt', '5th')

  fs.chmodSync(fullpath('key.secret'), 0o222)
  fs.chmodSync(fullpath('script.sh'), 0o755)
  if (!isWin) fs.symlinkSync('LICENSE', fullpath('LICENSE.shortcut'))
}

function makeBuffer (byteLength, data, offset = 0) {
  const buffer = b4a.alloc(byteLength)
  buffer.set(b4a.from(data), offset)
  return buffer
}
