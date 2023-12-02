import { getSln, getVs } from "./utils";
import { decode, encode } from "iconv-lite";
import { spawn } from "child_process";
import { commandSync, command } from "execa";
import { SVN, SVNOptions } from "@xuyanfeng/svn";
import {
  emptydirSync,
  emptyDirSync,
  ensureDirSync,
  existsSync,
  moveSync,
  readFileSync,
  removeSync,
  writeFileSync,
  unlinkSync,
} from "fs-extra";
import { join, extname, basename } from "path";
import { homedir } from "os";
import { glob, Glob } from "glob";
export class BuildEngine {
  private sln: string = "";
  private vs: string = "";
  private svn: SVN | null = null;
  private rootDir: string = "";

  private debug: boolean = false;
  /**
   * 是否清理掉上次的构建结果，主要是exe,dll
   */
  private isCleanLatestResults: boolean = true;
  /**
   * 构建结果的原始目录
   */
  private srcDir: string = "";
  /**
   * 构建结果要上传的svn仓库目录
   */
  private destDir: string = "";
  /**
   * 对应的vs构建配置
   */
  private vsConfig: string = "";

  public async init(rootDir: string, svn: SVN): Promise<boolean> {
    this.svn = svn;
    this.rootDir = rootDir;

    const sln = getSln(rootDir);
    console.log(`sln: ${sln}`);
    if (!sln) {
      console.error(`no sln found: ${sln}`);
      return false;
    }
    this.sln = sln;

    const vs = await getVs();
    console.log(`vs: ${vs}`);
    if (!vs) {
      console.error(`no vs found: ${vs}`);
      return false;
    }
    this.vs = vs;
    return true;
  }
  private switchToDebug(debug: boolean) {
    this.debug = debug;
    if (debug) {
      this.srcDir = this.rootDir;
      this.destDir = join(this.rootDir, "build", "debug");
      this.vsConfig = "Debug|Win32";
    } else {
      this.srcDir = join(this.rootDir, "simulator", "win32");
      this.destDir = join(this.rootDir, "build", "release");
      this.vsConfig = "Release|Win32";
    }
  }
  async buildWith2(): Promise<boolean> {
    this.cleanLatestBuildResult();
    const { vs, sln } = this;
    return new Promise((resolve, reject) => {
      const args = [sln!, "/Build", this.vsConfig];
      console.log(`vs build cmd: ${vs} ${args.join(" ")}`);
      const process = spawn(vs!, args);
      process.stdout.on("data", (str) => {
        this.log(str);
      });
      process.stderr.on("data", (str) => {
        this.log(str);
        reject(false);
      });
      process.on("close", async () => {
        console.log(`build ${this.debugTag} finished`);
        // 将结果复制到对应的目录里面，懒得再分析 msbuild 的构建参数了
        await this.commitBuildResult();
        resolve(true);
      });
    });
  }
  get debugTag(): string {
    return this.debug ? "debug" : "release";
  }
  async cleanLatestBuildResult() {
    const files = await this.getBuildResult();
    files.map((file) => {
      unlinkSync(file);
    });
  }
  async getBuildResult(): Promise<string[]> {
    const { srcDir, destDir } = this;
    const files = await glob(
      [
        `${srcDir}/*.exe`,
        `${srcDir}/*.dll`,
        // `${distDir}/*.pdb`,
      ],
      { absolute: true }
    );
    return files;
  }
  async commitBuildResult() {
    const { srcDir, destDir } = this;
    emptydirSync(destDir);
    const files = await this.getBuildResult();
    console.log(`${this.debugTag}构建结果`);
    console.log(files);
    if (files.length <= 0) {
      console.error(`${this.debugTag}构建失败`);
      process.exit(-1);
    }
    const destFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dest = join(destDir, basename(file));
      destFiles.push(dest);
      moveSync(file, dest, { overwrite: true });
    }
    if (this.svn) {
      this.svn.push(destFiles);
    }
  }
  private log(str: any) {
    if (process.env.vscode) {
      console.log(decode(str, "gbk"));
    } else {
      console.log(str.toString());
    }
  }
  public async buildAll() {
    this.switchToDebug(true);
    await this.buildWith2(); // build debug

    // this.switchToDebug(false);
    // await buildWith2(); // build release
  }

  private buildWith1() {
    const { sln, vs } = this;
    const aa = sln!.replace(/\\/g, "/");
    const cmd = `${vs} ${aa} /Build "Debug|Win32"`;
    console.log(cmd);
    const process = command(cmd);
    process.stdout?.on("data", (str: Buffer) => {
      this.log(str);
    });
    process.stderr?.on("data", (str: Buffer) => {
      this.log(str);
    });
    process.on("close", () => {
      console.log("build finish");
    });
  }
}
