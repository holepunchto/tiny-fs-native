#include <napi-macros.h>
#include <node_api.h>
#include <uv.h>
#include <stdlib.h>

static napi_ref on_open;

typedef struct {
  uv_fs_t req;
  napi_env env;
  uint64_t *stat;
  uint32_t id;
} tiny_fs_t;

static void
on_fs_response (uv_fs_t *req) {
  tiny_fs_t *p = (tiny_fs_t *) req;

  napi_handle_scope scope;
  napi_open_handle_scope(p->env, &scope);

  napi_value cb;
  napi_get_reference_value(p->env, on_open, &cb);

  napi_value global;
  napi_get_global(p->env, &global);

  napi_value argv[2];
  napi_create_uint32(p->env, p->id, &(argv[0]));
  napi_create_int32(p->env, req->result, &(argv[1]));

  uv_fs_req_cleanup(req);

  NAPI_MAKE_CALLBACK(p->env, NULL, global, cb, 2, (const napi_value *) argv, NULL);

  napi_close_handle_scope(p->env, scope);
}

static uint64_t
time_to_ms (uv_timespec_t time) {
  return time.tv_sec * 1e3 + time.tv_nsec / 1e6;
}

static void
on_fs_stat_response (uv_fs_t *req) {
  tiny_fs_t *p = (tiny_fs_t *) req;

  if (req->result == 0) {
    uint64_t *s = p->stat;

    *(s++) = req->statbuf.st_dev;
    *(s++) = req->statbuf.st_mode;
    *(s++) = req->statbuf.st_nlink;
    *(s++) = req->statbuf.st_uid;

    *(s++) = req->statbuf.st_gid;
    *(s++) = req->statbuf.st_rdev;
    *(s++) = req->statbuf.st_ino;
    *(s++) = req->statbuf.st_size;

    *(s++) = req->statbuf.st_blksize;
    *(s++) = req->statbuf.st_blocks;
    *(s++) = req->statbuf.st_flags;
    *(s++) = req->statbuf.st_gen;

    *(s++) = time_to_ms(req->statbuf.st_atim);
    *(s++) = time_to_ms(req->statbuf.st_mtim);
    *(s++) = time_to_ms(req->statbuf.st_ctim);
    *(s++) = time_to_ms(req->statbuf.st_birthtim);
  }

  on_fs_response(req);
}

NAPI_METHOD(tiny_fs_init) {
  NAPI_ARGV(1)
  napi_create_reference(env, argv[0], 1, &on_open);
  return NULL;
}

NAPI_METHOD(tiny_fs_open) {
  NAPI_ARGV(4)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UTF8(path, 4096, 1)
  NAPI_ARGV_INT32(flags, 2)
  NAPI_ARGV_INT32(mode, 3)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uv_fs_open(loop, (uv_fs_t *) req, path, flags, mode, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_write) {
  NAPI_ARGV(7)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)
  NAPI_ARGV_BUFFER(data, 2)
  NAPI_ARGV_UINT32(offset, 3)
  NAPI_ARGV_UINT32(len, 4)
  NAPI_ARGV_UINT32(pos_low, 5)
  NAPI_ARGV_UINT32(pos_high, 6)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  int64_t pos = ((int64_t) pos_high) * 0x100000000 + ((int64_t) pos_low);

  const uv_buf_t buf = {
    .base = data + offset,
    .len = len
  };

  uv_fs_write(loop, (uv_fs_t *) req, fd, &buf, 1, pos, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_writev) {
  NAPI_ARGV(5)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)

  napi_value arr = argv[2];
  napi_value item;

  NAPI_ARGV_UINT32(pos_low, 3)
  NAPI_ARGV_UINT32(pos_high, 4)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uint32_t nbufs;
  napi_get_array_length(env, arr, &nbufs);

  uv_buf_t *bufs = malloc(sizeof(uv_buf_t) * nbufs);

  for (uint32_t i = 0; i < nbufs; i++) {
    napi_get_element(env, arr, i, &item);
    uv_buf_t *buf = &(bufs[i]);
    napi_get_buffer_info(env, item, (void **) &(buf->base), &(buf->len));
  }

  int64_t pos = ((int64_t) pos_high) * 0x100000000 + ((int64_t) pos_low);

  uv_fs_write(loop, (uv_fs_t *) req, fd, bufs, nbufs, pos, on_fs_response);
  free(bufs);

  return NULL;
}

NAPI_METHOD(tiny_fs_read) {
  NAPI_ARGV(7)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)
  NAPI_ARGV_BUFFER(data, 2)
  NAPI_ARGV_UINT32(offset, 3)
  NAPI_ARGV_UINT32(len, 4)
  NAPI_ARGV_UINT32(pos_low, 5)
  NAPI_ARGV_UINT32(pos_high, 6)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  int64_t pos = ((int64_t) pos_high) * 0x100000000 + ((int64_t) pos_low);

  const uv_buf_t buf = {
    .base = data + offset,
    .len = len
  };

  uv_fs_read(loop, (uv_fs_t *) req, fd, &buf, 1, pos, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_readv) {
  NAPI_ARGV(5)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)

  napi_value arr = argv[2];
  napi_value item;

  NAPI_ARGV_UINT32(pos_low, 3)
  NAPI_ARGV_UINT32(pos_high, 4)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uint32_t nbufs;
  napi_get_array_length(env, arr, &nbufs);

  uv_buf_t *bufs = malloc(sizeof(uv_buf_t) * nbufs);

  for (uint32_t i = 0; i < nbufs; i++) {
    napi_get_element(env, arr, i, &item);
    uv_buf_t *buf = &(bufs[i]);
    napi_get_buffer_info(env, item, (void **) &(buf->base), &(buf->len));
  }

  int64_t pos = ((int64_t) pos_high) * 0x100000000 + ((int64_t) pos_low);

  uv_fs_read(loop, (uv_fs_t *) req, fd, bufs, nbufs, pos, on_fs_response);
  free(bufs);

  return NULL;
}

NAPI_METHOD(tiny_fs_ftruncate) {
  NAPI_ARGV(4)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)
  NAPI_ARGV_UINT32(len_low, 2)
  NAPI_ARGV_UINT32(len_high, 3)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  int64_t len = ((int64_t) len_high) * 0x100000000 + ((int64_t) len_low);

  uv_fs_ftruncate(loop, (uv_fs_t *) req, fd, len, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_close) {
  NAPI_ARGV(2)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uv_fs_close(loop, (uv_fs_t *) req, fd, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_mkdir) {
  NAPI_ARGV(3)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UTF8(path, 4096, 1)
  NAPI_ARGV_INT32(mode, 2)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uv_fs_mkdir(loop, (uv_fs_t *) req, path, mode, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_rmdir) {
  NAPI_ARGV(2)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UTF8(path, 4096, 1)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uv_fs_rmdir(loop, (uv_fs_t *) req, path, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_stat) {
  NAPI_ARGV(3)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UTF8(path, 4096, 1)
  NAPI_ARGV_BUFFER_CAST(uint64_t *, data, 2)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->stat = data;
  req->env = env;

  uv_fs_stat(loop, (uv_fs_t *) req, path, on_fs_stat_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_lstat) {
  NAPI_ARGV(3)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UTF8(path, 4096, 1)
  NAPI_ARGV_BUFFER_CAST(uint64_t *, data, 2)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->stat = data;
  req->env = env;

  uv_fs_lstat(loop, (uv_fs_t *) req, path, on_fs_stat_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_fstat) {
  NAPI_ARGV(3)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UINT32(fd, 1)
  NAPI_ARGV_BUFFER_CAST(uint64_t *, data, 2)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->stat = data;
  req->env = env;

  uv_fs_fstat(loop, (uv_fs_t *) req, fd, on_fs_stat_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_unlink) {
  NAPI_ARGV(2)

  NAPI_ARGV_BUFFER_CAST(tiny_fs_t *, req, 0)
  NAPI_ARGV_UTF8(path, 4096, 1)

  uv_loop_t *loop;
  napi_get_uv_event_loop(env, &loop);

  req->env = env;

  uv_fs_unlink(loop, (uv_fs_t *) req, path, on_fs_response);

  return NULL;
}

NAPI_METHOD(tiny_fs_get_error) {
  NAPI_ARGV(1)
  NAPI_ARGV_INT32(err, 0)

  napi_value arr;

  napi_create_array(env, &arr);

  napi_value name;
  napi_create_string_utf8(env, uv_err_name(err), NAPI_AUTO_LENGTH, &name);
  napi_set_element(env, arr, 0, name);

  napi_value desc;
  napi_create_string_utf8(env, uv_strerror(err), NAPI_AUTO_LENGTH, &desc);
  napi_set_element(env, arr, 1, desc);

  return arr;
}

NAPI_INIT() {
  NAPI_EXPORT_SIZEOF(tiny_fs_t)
  NAPI_EXPORT_OFFSETOF(tiny_fs_t, id)

  NAPI_EXPORT_FUNCTION(tiny_fs_init)
  NAPI_EXPORT_FUNCTION(tiny_fs_get_error)

  NAPI_EXPORT_FUNCTION(tiny_fs_open)
  NAPI_EXPORT_FUNCTION(tiny_fs_ftruncate)
  NAPI_EXPORT_FUNCTION(tiny_fs_open)
  NAPI_EXPORT_FUNCTION(tiny_fs_read)
  NAPI_EXPORT_FUNCTION(tiny_fs_readv)
  NAPI_EXPORT_FUNCTION(tiny_fs_write)
  NAPI_EXPORT_FUNCTION(tiny_fs_writev)
  NAPI_EXPORT_FUNCTION(tiny_fs_close)
  NAPI_EXPORT_FUNCTION(tiny_fs_mkdir)
  NAPI_EXPORT_FUNCTION(tiny_fs_rmdir)
  NAPI_EXPORT_FUNCTION(tiny_fs_stat)
  NAPI_EXPORT_FUNCTION(tiny_fs_lstat)
  NAPI_EXPORT_FUNCTION(tiny_fs_fstat)
  NAPI_EXPORT_FUNCTION(tiny_fs_unlink)

  NAPI_EXPORT_UINT32(O_RDWR)
  NAPI_EXPORT_UINT32(O_RDONLY)
  NAPI_EXPORT_UINT32(O_WRONLY)
  NAPI_EXPORT_UINT32(O_CREAT)
  NAPI_EXPORT_UINT32(O_TRUNC)
  NAPI_EXPORT_UINT32(O_APPEND)

  NAPI_EXPORT_UINT32(S_IFMT)
  NAPI_EXPORT_UINT32(S_IFREG)
  NAPI_EXPORT_UINT32(S_IFDIR)
  NAPI_EXPORT_UINT32(S_IFCHR)
  NAPI_EXPORT_UINT32(S_IFLNK)

#ifndef _WIN32
  NAPI_EXPORT_UINT32(S_IFBLK)
  NAPI_EXPORT_UINT32(S_IFIFO)
  NAPI_EXPORT_UINT32(S_IFSOCK)
#endif

  NAPI_EXPORT_INT32(UV_ENOENT)

#ifdef _WIN32
  uint32_t IS_WINDOWS = 1;
#else
  uint32_t IS_WINDOWS = 0;
#endif

  NAPI_EXPORT_UINT32(IS_WINDOWS)
}
