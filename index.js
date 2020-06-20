const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const semver = require("semver");
const EventEmitter = require("events");
const exec = require("child_process").exec;

function tinyUpdater({
  currentVersion,
  configType = "json",
  configUrl,
  configFilename,
  pkgFilename,
  filePath,
}) {
  const emitter = new EventEmitter();
  doUpdate();
  return emitter;

  async function doUpdate() {
    const isMac = process.platform === "darwin";
    configFilename = configFilename || "config.json";
    // 下载配置文件
    await download({
      url: configUrl,
      filename: configFilename,
      filePath,
      withProgress: false,
    });

    try {
      let fileInfo;
      const isYml = configType === "yml";
      if (isYml) {
        fileInfo = yaml.safeLoad(
          fs.readFileSync(path.join(filePath, configFilename), "utf8")
        );
      } else {
        fileInfo = JSON.parse(
          fs.readFileSync(path.join(filePath, configFilename), "utf8")
        );
      }

      if (semver.gt(fileInfo.version, currentVersion)) {
        pkgFilename = pkgFilename || "installation";
        // 下载安装包
        await download({
          url: isYml ? fileInfo.files[0].url : fileInfo.url,
          filename: pkgFilename,
          filePath,
        });

        if (isMac) {
          exec(`open ${path.join(filePath, pkgFilename)}`);
        } else {
          exec(path.join(filePath, pkgFilename));
        }
      } else {
        emitter.emit(
          "error",
          new Error("latest version is not newer than current version")
        );
      }
    } catch (e) {
      emitter.emit("error", e);
    }
  }

  function download({ url, filename, filePath, withProgress = true }) {
    return new Promise((resolve, reject) => {
      const agent = url.startsWith("https") ? https : http;
      const file = path.join(filePath, filename);
      const fileStream = fs.createWriteStream(file);
      const req = agent.request(url, (res) => {
        let downLength = 0;
        const totalLen = parseInt(res.headers["content-length"], 10);
        res
          .on("data", (data) => {
            downLength += data.length;
            fileStream.write(data);
            if (withProgress) {
              emitter.emit("download-progress", totalLen, downLength);
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
}

module.exports = {
  tinyUpdater,
};
