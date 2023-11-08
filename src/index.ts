import { SVN, SVNOptions } from "@xuyanfeng/svn";
import { commandSync, command } from "execa";
import { spawn } from "child_process";
import {
  emptyDirSync,
  ensureDirSync,
  existsSync,
  readFileSync,
  removeSync,
  writeFileSync,
} from "fs-extra";
import { join, extname, basename } from "path";
import { homedir } from "os";
// @ts-ignore
import { getInstalledApps } from "get-installed-apps";
import { APP } from "./const";
import { decode } from "iconv-lite";
const rootDir = join(__dirname, "../build");

function getSln(): string | null {
  const sln = join(rootDir, "runtime-src", "proj.win32", "tank5.sln");
  if (existsSync(sln)) {
    return sln;
  }
  return null;
}
async function getVs(): Promise<string | null> {
  const cfgFile = join(homedir(), "auto-build.json");
  function getConfigVsPath() {
    if (existsSync(cfgFile)) {
      const data = JSON.parse(readFileSync(cfgFile, "utf8"));
      return data.vs || null;
    }
    return null;
  }
  function setConfigVsPath(path: string) {
    writeFileSync(cfgFile, JSON.stringify({ vs: path }));
  }

  const vsPath = getConfigVsPath();
  if (vsPath) {
    return vsPath;
  }

  const apps: APP[] = await getInstalledApps();
  const vs = [];
  for (let i = 0; i < apps.length; i++) {
    const app: APP = apps[i];
    if (app.DisplayIcon && app.DisplayIcon.indexOf("devenv") !== -1) {
      vs.push(app);
    }
  }
  // find vs2019
  if (vs.length) {
    let targetApp: APP = vs[0];
    for (let i = 0; i < vs.length; i++) {
      const vsApp = vs[i];

      if (vsApp.DisplayIcon && vsApp.DisplayIcon.indexOf("2019")) {
        targetApp = vsApp;
        break;
      }
    }
    // 可以写入到本地配置，下次就不用再找了
    let vsPath = targetApp.DisplayIcon;
    // 使用window cmd可以使用> CON输出到命令行
    // vsCom 是命令行程序，可以显示输出的日志，vsEXE则不能
    let vsCom = vsPath.replace(".exe", ".com");
    if (existsSync(vsCom)) {
      vsPath = vsCom;
    }
    setConfigVsPath(vsPath);
    return vsPath;
  }
  return null;
}

(async () => {
  // removeSync(rootDir);
  ensureDirSync(rootDir);
  // const svn = new SVN();
  // svn.init({
  //   repo: "http://192.168.1.39:8080/svn/realTimeBattle/client/frameworks",
  //   dir: rootDir,
  //   checkout: true,
  //   filter: ["cocos2d-x", "runtime-src/Classes", "runtime-src/proj.win32"],
  // });
  const sln = getSln();
  if (!sln) {
    console.error(`no sln found: ${sln}`);
    return;
  }
  const vs = await getVs();
  if (!vs) {
    console.error(`no vs found: ${vs}`);
    return;
  }

  function buildWith2() {
    const process = spawn(vs!, [sln!, "/Build", "Debug|Win32"]);
    process.stdout.on("data", (str) => {
      console.log(decode(str, "gbk"));
    });
    process.stderr.on("data", (str) => {
      console.log(decode(str, "gbk"));
    });
    process.on("close", () => {
      console.log("close");
    });
  }
  function buildWith1() {
    const aa = sln!.replace(/\\/g, "/");
    const cmd = `${vs} ${aa} /Build "Debug|Win32"`;
    console.log(cmd);
    const process = command(cmd);
    process.stdout?.on("data", (str: Buffer) => {
      console.log(decode(str, "gbk"));
    });
    process.stderr?.on("data", (str: Buffer) => {
      console.log(decode(str, "gbk"));
    });
    process.on("close", () => {
      console.log("build finish");
    });
  }
  // buildWith1();
  buildWith2();
})();
