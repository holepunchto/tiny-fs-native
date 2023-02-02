cmake_minimum_required(VERSION 3.25)

project(tiny_fs_native C)

include(pear)

add_pear_module(tiny_fs_native)

target_sources(
  tiny_fs_native
  PRIVATE
    binding.c
)
