import { homedir } from "os";
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
// @ts-ignore
import { getInstalledApps } from "get-installed-apps";
import { APP } from "./const";
import { join, extname, basename } from "path";
export async function getVs(): Promise<string | null> {
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
export function getSln(rootDir: string): string | null {
  const sln = join(
    rootDir,
    "frameworks",
    "runtime-src",
    "proj.win32",
    "tank5.sln"
  );
  if (existsSync(sln)) {
    return sln;
  }
  return null;
}
