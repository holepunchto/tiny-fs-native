const binding = require('./binding')
const b4a = require('b4a')

const LE = (new Uint8Array(new Uint16Array([255]).buffer))[0] === 0xff

const sep = exports.sep = binding.IS_WINDOWS ? '\\' : '/'

const constants = exports.constants = {
  O_RDWR: binding.O_RDWR,
  O_RDONLY: binding.O_RDONLY,
  O_WRONLY: binding.O_WRONLY,
  O_CREAT: binding.O_CREAT,
  O_TRUNC: binding.O_TRUNC,
  O_APPEND: binding.O_APPEND,
  S_IFMT: binding.S_IFMT,
  S_IFREG: binding.S_IFREG,
  S_IFDIR: binding.S_IFDIR,
  S_IFCHR: binding.S_IFCHR,
  S_IFLNK: binding.S_IFLNK,
  S_IFBLK: binding.S_IFBLK || 0,
  S_IFIFO: binding.S_IFIFO || 0,
  S_IFSOCK: binding.S_IFSOCK || 0
}

const reqs = []
let used = 0

binding.tiny_fs_init(onfsresponse)

function flagsToMode (flags) {
  switch (flags) {
    case 'a': return constants.O_APPEND
    case 'a+': return constants.O_APPEND | constants.O_RDWR
    case 'w': return constants.O_WRONLY | constants.O_TRUNC | constants.O_CREAT
    case 'w+': return constants.O_RDWR | constants.O_TRUNC | constants.O_CREAT
    case 'r': return constants.O_RDONLY
    case 'r+': return constants.O_RDWR
  }

  throw new Error('Unknown flags: ' + flags)
}

function alloc () {
  const handle = b4a.alloc(binding.sizeof_tiny_fs_t)
  const view = new Uint32Array(handle.buffer, handle.byteOffset + binding.offsetof_tiny_fs_t_id, 1)

  view[0] = reqs.length

  const req = {
    handle,
    view,
    type: 0,
    buffer: null,
    callback: null
  }

  used++
  reqs.push(req)
  return req
}

function getReq () {
  return used === reqs.length ? alloc() : reqs[used++]
}

function onfsresponse (id, result) {
  const req = reqs[id]
  used--

  if (used !== id) {
    const u = reqs[used]
    reqs[u.view[0] = id] = u
    reqs[req.view[0] = used] = req
  }

  const callback = req.callback
  const buffer = req.buffer

  req.callback = null
  req.buffer = null

  if (result < 0) {
    callback(createError(result), result, null)
  } else {
    callback(null, result, buffer)
  }
}

function createError (code) {
  if (code === binding.UV_ENOENT) {
    const err = new Error('ENOENT: no such file or directory')
    err.errno = code
    err.code = 'ENOENT'
    return err
  }

  const err = new Error('Filesystem operation failed: ' + code)
  err.errno = code
  err.code = 'EUNKNOWN'
  return err
}

function write (fd, buf, offset, len, pos, cb) {
  if (typeof cb === 'function') {
    const req = getReq()

    req.buffer = buf
    req.callback = cb

    const low = pos === null ? 0xffffffff : ((pos & 0xffffffff) >>> 0)
    const high = pos === null ? 0xffffffff : (pos - low) / 0x100000000

    binding.tiny_fs_write(req.handle, fd, buf, offset, len, low, high)
    return
  }

  if (typeof offset === 'function') return write(fd, buf, 0, buf.byteLength, null, offset)
  if (typeof len === 'function') return write(fd, buf, offset, buf.byteLength - offset, null, len)
  if (typeof pos === 'function') return write(fd, buf, offset, len, null, pos)

  throw new Error('Callback required')
}

function read (fd, buf, offset, len, pos, cb) {
  if (typeof cb === 'function') {
    const req = getReq()

    req.buffer = buf
    req.callback = cb

    const low = pos === null ? 0xffffffff : ((pos & 0xffffffff) >>> 0)
    const high = pos === null ? 0xffffffff : (pos - low) / 0x100000000

    binding.tiny_fs_read(req.handle, fd, buf, offset, len, low, high)
    return
  }

  if (typeof offset === 'function') return read(fd, buf, 0, buf.byteLength, null, offset)
  if (typeof len === 'function') return read(fd, buf, offset, buf.byteLength - offset, null, len)
  if (typeof pos === 'function') return read(fd, buf, offset, len, null, pos)

  throw new Error('Callback required')
}

function open (filename, flags, mode, cb) {
  if (typeof mode === 'function') {
    cb = mode
    mode = 0o666
  }

  if (typeof flags === 'string') {
    flags = flagsToMode(flags)
  }

  const req = getReq()

  req.callback = cb
  binding.tiny_fs_open(req.handle, filename, flags, typeof mode === 'number' ? mode : 0o666)
}

function close (fd, cb) {
  const req = getReq()

  req.callback = cb
  binding.tiny_fs_close(req.handle, fd, cb)
}

function ftruncate (fd, len, cb) {
  const req = getReq()

  const low = (len & 0xffffffff) >>> 0
  const high = (len - low) / 0x100000000

  req.callback = cb
  binding.tiny_fs_ftruncate(req.handle, fd, low, high)
}

class Stats {
  constructor (buf) {
    const view = new Uint32Array(buf.buffer, buf.byteOffset, 32)

    this.dev = toNumber(view, 0)
    this.mode = toNumber(view, 2)
    this.nlink = toNumber(view, 4)
    this.uid = toNumber(view, 6)
    this.gid = toNumber(view, 8)
    this.rdev = toNumber(view, 10)
    this.ino = toNumber(view, 12)
    this.size = toNumber(view, 14)
    this.blksize = toNumber(view, 16)
    this.blocks = toNumber(view, 18)
    this.flags = toNumber(view, 20)
    this.gen = toNumber(view, 22)
    this.atimeMs = toNumber(view, 24)
    this.mtimeMs = toNumber(view, 26)
    this.ctimeMs = toNumber(view, 28)
    this.birthtimeMs = toNumber(view, 30)
    this.atime = new Date(this.atimeMs)
    this.mtime = new Date(this.mtimeMs)
    this.ctime = new Date(this.ctimeMs)
    this.birthtime = new Date(this.birthtimeMs)
  }

  isDirectory () {
    return (this.mode & constants.S_IFDIR) !== 0
  }

  isFile () {
    return (this.mode & constants.S_IFREG) !== 0
  }

  isBlockDevice () {
    return (this.mode & constants.S_IFBLK) !== 0
  }

  isCharacterDevice () {
    return (this.mode & constants.S_IFCHR) !== 0
  }

  isFIFO () {
    return (this.mode & constants.S_IFIFO) !== 0
  }

  isSymbolicLink () {
    return (this.mode & constants.S_IFLNK) !== 0
  }

  isSocket () {
    return (this.mode & constants.S_IFSOCK) !== 0
  }
}

function toNumber (view, n) {
  return LE ? view[n] + view[n + 1] * 0x100000000 : view[n] * 0x100000000 + view[n + 1]
}

function stat (path, cb) {
  const req = getReq()

  req.buffer = b4a.allocUnsafe(16 * 8)

  req.callback = function (err, _, buf) {
    if (err) cb(err, null)
    else cb(null, new Stats(buf))
  }

  binding.tiny_fs_stat(req.handle, path, req.buffer)
}

function lstat (path, cb) {
  const req = getReq()

  req.buffer = b4a.allocUnsafe(16 * 8)

  req.callback = function (err, _, buf) {
    if (err) cb(err, null)
    else cb(null, new Stats(buf))
  }

  binding.tiny_fs_lstat(req.handle, path, req.buffer)
}

function fstat (fd, cb) {
  const req = getReq()

  req.buffer = b4a.allocUnsafe(16 * 8)

  req.callback = function (err, _, buf) {
    if (err) cb(err, null)
    else cb(null, new Stats(buf))
  }

  binding.tiny_fs_fstat(req.handle, fd, req.buffer)
}

function mkdirp (path, mode, cb) {
  mkdir(path, { mode }, function (err) {
    if (err === null) return cb(null, 0, null)

    if (err.errno !== binding.UV_ENOENT) {
      stat(path, function (e, st) {
        if (e) return cb(e, e.errno, null)
        if (st.isDirectory()) return cb(null, 0, null)
        cb(err, err.errno, null)
      })
      return
    }

    while (path.endsWith(sep)) path = path.slice(0, -1)
    const i = path.lastIndexOf(sep)
    if (i <= 0) return cb(err, err.errno, null)

    mkdirp(path.slice(0, i), mode, function (err) {
      if (err) return cb(err, err.errno, null)
      mkdir(path, { mode }, cb)
    })
  })
}

function mkdir (path, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = { mode: 0o777 }
  }

  if (!opts) opts = {}

  const mode = typeof opts.mode === 'number' ? opts.mode : 0o777

  if (opts.recursive) {
    return mkdirp(path, mode, cb)
  }

  const req = getReq()

  req.callback = cb
  binding.tiny_fs_mkdir(req.handle, path, mode)
}

function rmdir (path, cb) {
  const req = getReq()

  req.callback = cb
  binding.tiny_fs_rmdir(req.handle, path)
}

function unlink (path, cb) {
  const req = getReq()

  req.callback = cb
  binding.tiny_fs_unlink(req.handle, path)
}

function readFile (path, opts, cb) {
  if (typeof opts === 'function') return readFile(path, null, opts)
  if (typeof opts === 'string') opts = { encoding: opts }
  if (!opts) opts = {}

  open(path, opts.flag || 'r', function (err, fd) {
    if (err) return cb(err)

    fstat(fd, function (err, st) {
      if (err) return closeAndError(err)

      const buf = b4a.allocUnsafe(st.size)

      read(fd, buf, loop)

      function loop (err, r, buf) {
        if (err) return closeAndError(err)
        if (r === buf.byteLength) return done()
        read(fd, buf.subarray(r), loop)
      }

      function done () {
        close(fd, function (err) {
          if (err) return cb(err)
          if (opts.encoding) return cb(null, b4a.toString(buf, opts.encoding))
          return cb(null, buf)
        })
      }
    })

    function closeAndError (err) {
      close(fd, function () {
        cb(err)
      })
    }
  })
}

function writeFile (path, buf, opts, cb) {
  if (typeof opts === 'function') return writeFile(path, buf, null, opts)
  if (typeof opts === 'string') opts = { encoding: opts }
  if (!opts) opts = {}

  if (opts.encoding || typeof buf === 'string') {
    buf = b4a.from(buf, opts.encoding)
  }

  open(path, opts.flag || 'w', opts.mode, function (err, fd) {
    if (err) return cb(err)

    write(fd, buf, loop)

    function loop (err, w, buf) {
      if (err) return closeAndError(err)
      if (w === buf.byteLength) return done()
      write(fd, buf.subarray(w), loop)
    }

    function done () {
      close(fd, function (err) {
        if (err) return cb(err)
        return cb(null)
      })
    }

    function closeAndError (err) {
      close(fd, function () {
        cb(err)
      })
    }
  })
}

exports.promises = {}

exports.open = open
exports.close = close
exports.read = read
exports.write = write
exports.ftruncate = ftruncate
exports.fstat = fstat

exports.unlink = unlink
exports.promises.unlink = promisify(unlink)

exports.readFile = readFile
exports.promises.readFile = promisify(readFile)

exports.writeFile = writeFile
exports.promises.writeFile = promisify(writeFile)

exports.mkdir = mkdir
exports.promises.mkdir = promisify(mkdir)

exports.rmdir = rmdir
exports.promises.rmdir = promisify(rmdir)

exports.Stats = Stats // for compat

exports.stat = stat
exports.promises.stat = promisify(stat)

exports.lstat = lstat
exports.promises.lstat = promisify(lstat)

exports._onfsresponse = onfsresponse // just for trible ensurance gc...

function promisify (fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn(...args, function (err, res) {
        if (err) return reject(err)
        resolve(res)
      })
    })
  }
}
