import { SVN } from "@xuyanfeng/svn";
import { ensureDirSync } from "fs-extra";
import { join } from "path";
console.log("1");
ensureDirSync(join(__dirname, "../build"));

