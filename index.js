const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const semver = require("semver");
const EventEmitter = require("events");
const exec = require("child_process").exec;

class TinyUpdater {
  constructor({
    currentVersion,
    configUrl,
    localFolder
  }) {
    this.currentVersion = currentVersion
    this.configUrl = configUrl
    this.remoteUrl = path.basename(configUrl)
    this.localFolder = localFolder

    this.emitter = new EventEmitter();

    this.checkForUpdates()
  }

  async checkForUpdates() {
    this.config = await this._getConfig()

    if (semver.gt(this.config.version, this.currentVersion)) {
      this.emitter.emit('updater', 'updates-available')

      if (this.checkIfDownloaded(this.currentVersion)) {
        this.emitter.emit('updater', 'updates-downloaded')

        this.emitter.emit('updater', 'installing')

        await this.install()
      } else {
        await this.download()
      }
    } else {
      this.emitter.emit('updater', 'actual-version')
    }
  }

  async download() {
    this.emitter.emit('updater', 'downloading-updates')

    const downloadLink = this._detectProperDownloadLink()

    await this._downloadFile({
      url: downloadLink,
      filenameToSave: 'installer.' + this._getSystemInstallerExtension(),
      directoryToSave: path.join(this.directoryToSave, this.currentVersion),
      withProgress: true
    })

    this.emitter.emit('updater', 'updates-downloaded')
  }

  checkIfDownloaded() {
    return fs.existsSync(
      path.join(
        this.directoryToSave,
        this.currentVersion,
        `installer.${this._getSystemInstallerExtension()}`
      )
    )
  }

  install() {
    const isMac = process.platform === "darwin";
    const isWin = process.platform === 'win32'

    if (isMac) {
      exec(`installer -pkg ${path.join(filePath, pkgFilename)} -target /`);
    } else if (isWin) {
      exec(path.join(filePath, pkgFilename));
    } else {
      this.emitter.emit('updater', 'unsupported-platform')
      return
    }

    const { app } = require('electron')
    app.quit()
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
            if (withProgress) {
              emitter.emit('updater', "download-progress", totalLen, downLength);
            }
          })
          .on("end", () => {
            fileStream.end();
          });

        fileStream.on("close", () => {
          resolve();
        });

        fileStream.on("error", (e) => {
          emitter.emit("error", e);
          fileStream.destroy();
          fs.remove(file);
          reject();
        });
      });
      req.on("error", () => {
        emitter.emit("error", e);
        fileStream.destroy();
        fs.remove(file);
        reject();
      });
      req.end();
    });
  }

  _detectProperDownloadLink(config) {
    let neededFormat = this._getSystemInstallerExtension()

    for (const file of config.files) {
      if (neededFormat === 'pkg') {
        neededFormat = 'dmg'
      }

      if (file.url.endsWith(neededFormat)) {
        if (neededFormat === 'dmg') {
          const properArch = process.arch === 'arm64' ? 'arm64' : 'x64'

          return path.join(
            this.remoteUrl,
            file.url
              .replace('dmg', 'pkg')
              .replace('x64', properArch)
              .replace('arm64', properArch)
          )
        }

        return path.join(this.remoteUrl, file.url)
      }
    }
  }

  async _getConfig() {
    const urlOnDisk = path.join(this.localFolder, 'latest.yml')

    await this._downloadFile({
      url: this.configUrl,
      filenameToSave: 'latest.yml',
      directoryToSave: this.localFolder,
      withProgress: false,
    });

    try {
      const config = yaml.safeLoad(
        fs.readFileSync(urlOnDisk, "utf8")
      );

      return config
    } catch (_) { /** */ }
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
