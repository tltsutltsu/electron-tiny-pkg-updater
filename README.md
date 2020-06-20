[English](https://github.com/vzhufeng/electron-tiny-updater/blob/master/README-EN.md)

一个极精简版本的electron应用更新器，依赖electron-builder打包的结果，支持mac和windows

没有electron-updater的诸多校验和判断逻辑，只是单纯的下载和执行安装包，如果你用NSIS处理打包结果，比如添加一些注册表操作等，你就通不过electron-updater的sha校验，或者你手动生成一个sha值填到latest.yml中

或者如果你使用零配置的electron-builder，不生成latest.yml这些文件，也可以使用electron-tiny-updater

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
  currentVersion: '1.0.2', // 当前应用的版本号，可以通过package.json来引入
  configType: 'yml', // 配置文件类型，支持yml和json格式两种
  configUrl: 'https://xxx.com/latest.yml', // 配置文件的url
  configFilename: 'latest.yml', // 配置文件名
  pkgFilename: 'app.exe', // 安装包名称
  filePath: path.join(__dirname, '../..') // 文件保存的路径
});

// 第一个参数total表示安装包的总大小，第二个参数length表示当前已下载的大小
emitter.on('download-progress', (total, length)=>{
  console.log(total, length, 'progress')
});

emitter.on('error', (e)=>{
  console.log(e, 'error')
});
```

参数configType支持填写yml和json两个值，如果使用electron-builder打包，配置了publish选项的话，会得到一个latest.yml，里面会包含安装包的版本信息，一个windows版本的latest.yml文件示例如下，可能需要手动修改url路径和files的顺序（windows下第一个文件放exe，mac下第一个文件放dmg），electron-tiny-updater会下载files中的**第一个**文件信息
```
version: 2.1.2
files:
  - url: http://xxx/app_2.1.2.exe
    sha512: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    size: 59388528
  - url: http://xxx/app_2.1.2.zip
    sha512: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    size: 19388528
path: app_2.1.2.exe
sha512: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
releaseDate: '2020-06-17T03:52:46.882Z'
```

如果没有配置publish选项，可以手动提供一个json或者yml格式的配置文件，一个json格式的配置文件示例如下，只提供版本信息和安装包的url就足够了
```
{
  "version": "2.1.2",
  "url": "http://xxx/app_2.1.2.exe"
}
```

将配置文件上传到服务器或者CDN，然后将url地址填入configUrl参数，electron-tiny-updater会下载并解析配置文件，获取版本信息，并和currentVersion参数做对比，如果配置文件里的版本更高，会下载安装包，安装包也需要先上传，electron-tiny-updater会下载并提供`download-progress`事件以展示下载进度

filePath、pkgFilename、configFilename用于下载文件后的文件保存，配置文件会保存在`path.join(filePath, configFilename)`路径，安装包会保存在`path.join(filePath, pkgFilename)`，因为没有合适的时机删除已下载的文件，建议给pkgFilename和configFilename一个固定值，每次更新都只会留下这两个文件，不会累积安装包文件