[English](https://github.com/vzhufeng/electron-tiny-updater/blob/master/README-EN.md)

一个极精简版本的electron应用更新器，依赖electron-builder打包的结果，支持mac和win

没有electron-updater的诸多校验和判断逻辑，只是单纯的下载和执行安装包，如果你用NSIS处理打包结果，比如添加一些注册表操作等，你就通不过electron-updater的sha校验，或者你手动生成一个sha值填到latest.yml中

## 安装
```
npm i electron-tiny-updater
```

## 使用
在你的electron应用主进程中添加如下代码
```
const {tinyUpdater} =  require('electron-tiny-updater');
const path =  require('path');

const emitter = tinyUpdater({
  currentVersion: '1.0.2', // 当前应用的版本号
  ymlUrl: 'https://xxx.com/latest.yml', // yml文件的url
  ymlFilename: 'latest.yml', // yml文件名
  pkgUrl: 'https://xxx.com/app.exe', // 安装包url
  pkgFilename: 'app.exe', // 安装包名称
  filePath: path.join(__dirname, '../..') // 文件保存的路径
});

emitter.on('download-progress', (total, length)=>{
  console.log(total, length, 'progress')
});

emitter.on('error', (e)=>{
  console.log(e, 'error')
});
```

ymlFilename可以省略，在win下默认值是latest.yml，mac下是latest-mac.yml

pkgFilename可以省略，在win下默认值是yml中files项里第一个以.exe结尾的url值，mac下是yml中files项里第一个以.dmg结尾的url值，如果还找不到，会取path值

## 说明
以windows为例，一般我们用electron-builder打包会得到一个latest.yml，里面会包含安装包的版本信息，electron-tiny-updater会根据版本号version判断是否下载更新，下载后执行安装文件
```
version: 2.1.2
files:
  - url: app_2.1.2.exe
    sha512: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    size: 59388528
  - url: app_2.1.2.zip
    sha512: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    size: 19388528
path: app_2.1.2.exe
sha512: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
releaseDate: '2020-06-17T03:52:46.882Z'
```



