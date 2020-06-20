const {tinyUpdater} = require('./index.js');
const path =  require('path');

const emitter = tinyUpdater({
  currentVersion: '2.0.2', // 当前应用的版本号
  configType: 'yml',
  configUrl: 'http://localhost:7777/latest-mac.yml', // yml文件的url
  configFilename: 'latest.yml',
  pkgFilename: 'app.dmg',
  filePath: path.join(__dirname) // 文件保存的路径
});

emitter.on('download-progress', (total, length)=>{
  console.log(total, length, 'progress')
});

emitter.on('error', (e)=>{
  console.log(e, 'error')
});