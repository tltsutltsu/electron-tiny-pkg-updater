const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const semver = require("semver");
const EventEmitter = require("events");
const { spawn } = require("child_process");
const exec = require("child_process").exec;
const fetch = require("node-fetch");
const sleep = require('sleep-promise');

class TinyUpdater {
  constructor({
    currentVersion,
    localFolder,
    userAgent,
    apiEndpoint,
    checkInterval = 1000 * 60 * 30,
  }) {
    this.currentVersion = currentVersion
    this.localFolder = localFolder
    this.userAgent = userAgent
    this.apiEndpoint = apiEndpoint

    try {
      fs.mkdirSync(localFolder)
    } catch (_) { /** */ }

    try {
      this.emitter = new EventEmitter();

      this.checkForUpdates()
        .catch(e => this.emitter.emit('error', 'error in checkforupdates', e))

      // using arrow function to pass `this` context
      setInterval(() => {
        this.checkForUpdates()
          .catch(e => this.emitter.emit('error', 'error in checkforupdates', e))
      }, checkInterval)
    } catch (e) {
      this.emitter.emit('error', 'error in main cycle', e)
    }
  }

  async checkForUpdates() {
    this.config = await this._getConfig()

    if (!this.config) { return }
    if (!this.config.version) { return }

    await sleep(4000)

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

  async _getConfig() {
    const request = await this._makeApiRequest({
      method: "POST",
      url: this.apiEndpoint
    })

    const response = await request.json()

    return response.application_data
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
