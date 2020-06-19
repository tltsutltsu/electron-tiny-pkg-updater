[中文](https://github.com/vzhufeng/electron-tiny-updater/blob/master/README.md)

a tiny updater for your electron app, depend on the result produced by electron-builder, support mac and win.

no complex verify process like electron-updater, only download and execute opration. if you use NSIS deal with your exe, you may have trouble with sha512 verify of electron-updater, unless you generate a sha512 by yourself and paste it into latest.yml.

## install
```
npm i electron-tiny-updater
```

## usage
code in your electron main process
```
const {tinyUpdater} =  require('electron-tiny-updater');
const path =  require('path');

const emitter = tinyUpdater({
  currentVersion: '1.0.2',
  ymlUrl: 'https://xxx.com/latest.yml',
  ymlFilename: 'latest.yml',
  pkgUrl: 'https://xxx.com/app.exe', // installation package url
  pkgFilename: 'app.exe', // installation package name
  filePath: path.join(__dirname, '../..') // the path you want to save the files(yml and installation package)
});

emitter.on('download-progress', (total, length)=>{
  console.log(total, length, 'progress')
});

emitter.on('error', (e)=>{
  console.log(e, 'error')
});
```

parameter `ymlFilename` can be omitted, in win the default value is `latest.yml`, in mac it's `latest-mac.yml`.

parameter `pkgFilename` can be omitted, in win the default value is the first `url` value in yml file which ends with `.exe`, in mac it's the first `url` value in yml file which ends with `.dmg`, if the value can't be found above, it will be the `path` value in yml file.

## detail
take win as example, we can get a latest.yml file after using electron-builder, which contains version info(.etc) of installation package, electron-tiny-updater will compare the version, download and install the package.

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



