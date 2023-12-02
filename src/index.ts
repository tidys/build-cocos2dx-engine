import { SVN, SVNOptions } from "@xuyanfeng/svn";
import { commandSync, command } from "execa";
import {
  emptydirSync,
  emptyDirSync,
  ensureDirSync,
  existsSync,
  moveSync,
  readFileSync,
  removeSync,
  writeFileSync,
} from "fs-extra";
import { join, extname, basename } from "path";
import { homedir } from "os";
import { glob, Glob } from "glob";
import { BuildEngine } from "./build-engine";
const rootDir = join(__dirname, "../build");

const svn = new SVN();

/**
 * 逻辑入口
 */
(async () => {
  // removeSync(rootDir);
  ensureDirSync(rootDir);
  svn.autoLog = "build";
  svn.init({
    repo: "http://192.168.1.39:8080/svn/realTimeBattle/client/",
    dir: rootDir,
    checkout: true,
    filter: [
      "frameworks/cocos2d-x",
      "frameworks/runtime-src/Classes",
      "frameworks/runtime-src/proj.win32",
      "build/debug",
      "build/release",
    ],
  });
  const be = new BuildEngine();
  const ret = await be.init(rootDir, svn);
  if (!ret) {
    console.log("build engine init failed");
    process.exit(-2);
  }
  await be.buildAll();
  console.log("build finish");
})();
