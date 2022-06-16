#!/bin/bash

data_script_path=../../watchmen-storage-mysql/data-scripts
meta_script_path=../../watchmen-storage-mysql/meta-scripts
target_path=./mysql

for version in `ls ${data_script_path}`
  do
    if [ -d ${data_script_path}/$version ];then
      for file in ${data_script_path}/$version/*
        do
          echo `pwd`/$file
          echo ${file##*/}
          if [ ! -d "./mysql" ]; then
            mkdir ./mysql
          fi
          cp -rf $file ${target_path}/"$version-${file##*/}"
        done
    fi
  done

for version in `ls ${meta_script_path}`
  do
    if [ -d ${meta_script_path}/$version ];then
      for file in ${meta_script_path}/$version/*
        do
          echo `pwd`/$file
          echo ${file##*/}
          if [ ! -d "./mysql" ]; then
            mkdir ./mysql
          fi
          cp -rf $file ${target_path}/"$version-${file##*/}"
        done
    fi
  done