a tiny updater for your electron app, depend on the result produced by electron-builder, support mac and windows.

no complex verify process like electron-updater, only download and execute opration. if you use NSIS deal with your exe, you may have trouble with sha512 verify of electron-updater, unless you generate a sha512 by yourself and paste it into latest.yml.

if you use zero configration with electron-builder, you will not get files like latest.yml, you can also use electron-tiny-updater.

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
  currentVersion: '1.0.2', // you can get it from package.json
  configType: 'yml', // config file type, support 'yml' and 'json'
  configUrl: 'https://xxx.com/latest.yml', // config file url
  configFilename: 'latest.yml', // config file name
  pkgFilename: 'app.exe', // installation package name
  filePath: path.join(__dirname, '../..') // the path you want to save the files

// 1st param is the total size of the installation package, 2nd param is the downloaded size
emitter.on('download-progress', (total, length)=>{
  console.log(total, length, 'progress')
});

emitter.on('error', (e)=>{
  console.log(e, 'error')
});
```

param `configType` support 'yml' and 'json', if you use electron-builder, and set option `publish`, you will get a `latest.yml` file, which contains version info(.etc) of the installation package, a latest.yml of windows is like this.

you may need to modify the url and the order of `files` items, in windwos the first item set the `exe` file, in mac set `dmg` file, electron-tiny-updater will download the **first** item.
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

if you don't set `publish`, you can provide a config file with `json` or `yml` type, a json config file is like this, provide version and installation package url info is enough

```
{
  "version": "2.1.2",
  "url": "http://xxx/app_2.1.2.exe"
}
```

upload the config file to the server or CDN, and set the url to param `configUrl`, electron-tiny-updater will download and parse it, get the version info, compare it with `currentVersion`, if `version` is greater than `currentVersion`, will download the installation package, the installation package need to upload first, electron-tiny-updater provide `download-progress` to show the progress

`filePath, pkgFilename, configFilename` is used to save the download files, the config file will save at `path.join(filePath, configFilename)`, the installation package will save at `path.join(filePath, pkgFilename)`. there is no good time to delete the downloaded files, so they will be left there, it is suggested to set `pkgFilename, configFilename` a constant value
