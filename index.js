const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const semver = require("semver");
const EventEmitter = require("events");
const { spawn } = require("child_process");
const exec = require("child_process").exec;
const fetch = require("node-fetch")

class TinyUpdater {
  constructor({
    currentVersion,
    configUrl,
    localFolder,
    userAgent,
    apiEndpoint,
    checkInterval = 1000 * 60 * 30,
  }) {
    this.currentVersion = currentVersion
    this.configUrl = configUrl
    this.remoteUrl = path.dirname(configUrl)
    this.localFolder = localFolder
    this.userAgent = userAgent
    this.apiEndpoint = apiEndpoint

    try {
      fs.mkdirSync(localFolder)
    } catch (_) { /** */ }

    this.emitter = new EventEmitter();

    this.checkForUpdates()

    // using arrow function to pass `this` context
    setInterval(() => { this.checkForUpdates() }, checkInterval)
  }

  async checkForUpdates() {
    this.config = await this._getConfig()

    if (semver.gt(this.config.version, this.currentVersion)) {
      this.emitter.emit('updater', 'updates-available')

      if (this.checkIfDownloaded(this.config.version)) {
        this.emitter.emit('updater', 'updates-downloaded', this.config.version)
      } else {
        await this.download()
      }
    } else {
      this.emitter.emit('updater', 'actual-version')
    }
  }

  async download() {
    this.emitter.emit('updater', 'downloading-updates')

    const downloadLink = this.config.download_link
    const directoryToSave = path.dirname(this.getVersionInstallerPath(this.config.version))

    try {
      fs.mkdirSync(directoryToSave)
    } catch (_) { /** */ }

    await this._downloadFile({
      url: downloadLink,
      filenameToSave: 'installer.' + this._getSystemInstallerExtension(),
      directoryToSave,
      withProgress: true
    })

    // if we got some error while downloading
    // then wait till another start
    if (!this.checkIfDownloaded(this.config.version)) {
      this.emitter.emit('error', 'checksums wrong or filesize is low')
      return
    }

    this.emitter.emit('updater', 'updates-downloaded', this.config.version)
  }

  getVersionInstallerPath(version) {
    return path.join(
      this.localFolder,
      version,
      `installer.${this._getSystemInstallerExtension()}`
    )
  }

  checkIfDownloaded(version) {
    const installerPath = this.getVersionInstallerPath(version)
    const exists = fs.existsSync(installerPath)

    if (!exists) return false

    const sizeInMb = fs.statSync(installerPath)
      .size / (1024 * 1024)

    const configMd5 = this.config.application_hash
    const installerMd5 = require('md5-file').sync(installerPath)
    const md5IsCorrect = configMd5 === installerMd5

    this.emitter.emit('md5', {
      configMd5,
      'arch': this.getProcessArch(),
      'this.config.application_hash': this.config.application_hash,
      installerMd5,
      md5IsCorrect
    })

    return sizeInMb > 40 && md5IsCorrect
  }

  install() {
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32'

    const installerPath = this.getVersionInstallerPath(this.config.version)

    if (isMac) {
      exec(`open "${installerPath}"`);
    } else if (isWin) {
      const subprocess = spawn(installerPath, {
        detached: true,
        stdio: 'ignore'
      })

      subprocess.unref()
    } else {
      this.emitter.emit('updater', 'error', 'unsupported-platform')
      return
    }
  }

  _makeApiRequest({ method = "GET", url, data }) {
    let options = {
      method,
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/json'
      }
    };

    if (!["GET", "HEAD"].includes(method) && data) {
      options['body'] = JSON.stringify(data)
    }

    return fetch(
      url,
      options
    )
  }

  _downloadFile({ url, filenameToSave, directoryToSave, withProgress = true }) {
    return new Promise((resolve, reject) => {
      const agent = url.startsWith("https") ? https : http;
      const file = path.join(directoryToSave, filenameToSave);
      const fileStream = fs.createWriteStream(file);
      const req = agent.request(url, (res) => {
        let downLength = 0;
        const totalLen = parseInt(res.headers["content-length"], 10);
        res
          .on("data", (data) => {
            downLength += data.length;
            fileStream.write(data);
            if (withProgress && downLength % 1000 === 0) {
              this.emitter.emit('updater', "download-progress", totalLen, downLength);
            }
          })
          .on("end", () => {
            fileStream.end();
          });

        fileStream.on("close", () => {
          resolve();
        });

        fileStream.on("error", (e) => {
          this.emitter.emit("error", e);
          fileStream.destroy();
          fs.unlinkSync(file);//FIXME: may cause bugs
          reject();
        });
      });
      req.on("error", (e) => {
        this.emitter.emit("error", e);
        fileStream.destroy();
        fs.unlinkSync(file);//FIXME: may cause bugs
        reject();
      });
      req.end();
    });
  }

  _detectProperDownloadLink() {
    let neededFormat = this._getSystemInstallerExtension()

    for (const file of this.config.files) {
      if (neededFormat === 'pkg') {
        neededFormat = 'dmg'
      }

      if (file.url.endsWith(neededFormat)) {
        if (neededFormat === 'dmg') {
          const properArch = this.getProcessArch() === 'arm64' ? 'arm64' : 'x64'

          const link = path.join(
            this.remoteUrl,
            file.url
              .replace('dmg', 'pkg')
              .replace('x64', properArch)
              .replace('arm64', properArch)
          )

          this.emitter.emit('download-link', link)

          return link
        }

        return path.join(this.remoteUrl, file.url)
      }
    }
  }

  async _getConfig() {
    const config = await this._makeApiRequest({
      method: "POST",
      url: this.apiEndpoint
    })

    return JSON.parse(config)
  }

  _getSystemInstallerExtension() {
    let neededFormat = 'deb'

    switch (process.platform) {
      case 'win32':
        neededFormat = 'exe'
        break;
      case 'darwin':
        neededFormat = 'pkg'
        break;
    }

    return neededFormat
  }
}

module.exports = {
  TinyUpdater,
};
