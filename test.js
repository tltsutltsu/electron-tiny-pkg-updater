const {tinyUpdater} = require('./index.js');
const path =  require('path');

const emitter = tinyUpdater({
  currentVersion: '1.0.2', // 当前应用的版本号
  ymlUrl: 'http://localhost:7777/latest.yml', // yml文件的url
  pkgUrl: 'http://localhost:7777/app_2.2.0.exe', // 安装包url
  filePath: path.join(__dirname) // 文件保存的路径
});

emitter.on('download-progress', (total, length)=>{
  console.log(total, length, 'progress')
});

emitter.on('error', (e)=>{
  console.log(e, 'error')
});