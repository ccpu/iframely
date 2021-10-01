const https = require("http");
import fs from "fs";
import path from "path";
const FS = require("fs");

let Files: any[] = [];

function ThroughDirectory(Directory: any) {
  FS.readdirSync(Directory).forEach((File: any) => {
    const Absolute = path.join(Directory, File);
    if (FS.statSync(Absolute).isDirectory()) return ThroughDirectory(Absolute);
    else return Files.push(Absolute);
  });
}

ThroughDirectory("../plugins/domains/");

if (fs.existsSync("./data")) {
  fs.rmSync("./data", { recursive: true });
}

fs.mkdirSync("data", { recursive: true });

let ErrorFiles: any[] = [];

let merged: any = {};

function deepMerge(target: any, source: any) {
  if (typeof target !== "object" || typeof source !== "object") return false;
  for (var prop in source) {
    if (!source.hasOwnProperty(prop)) continue;
    if (prop in target) {
      if (typeof target[prop] !== "object") {
        target[prop] = source[prop];
      } else {
        if (typeof source[prop] !== "object") {
          target[prop] = source[prop];
        } else {
          if (target[prop].concat && source[prop].concat) {
            target[prop] = target[prop].concat(source[prop]);
          } else {
            target[prop] = deepMerge(target[prop], source[prop]);
          }
        }
      }
    } else {
      target[prop] = source[prop];
    }
  }
  return target;
}

Files.forEach((file: string) => {
  try {
    if (file.endsWith(".js")) {
      const module = require(file);
      const tests: any[] = module.tests;

      if (tests && tests.length) {
        const pathParsed = path.parse(file);
        tests.forEach((test) => {
          if (typeof test === "string") {
            console.log(test);
            https
              .get(
                `http://localhost:8061/iframely?url=${test}`,
                (response: any) => {
                  let finalData = "";

                  response.on("data", function (data: any) {
                    finalData += data.toString();
                  });

                  response.on("end", function () {
                    let jsonStr = "";
                    try {
                      jsonStr = JSON.stringify(JSON.parse(finalData), null, 2);
                    } catch (e) {
                      console.log(e);
                    }
                    try {
                      merged = deepMerge(JSON.parse(finalData), merged);

                      fs.writeFileSync(
                        `./data/merged.json`,
                        JSON.stringify(merged, null, 2)
                      );
                    } catch (error) {
                      console.log(error);
                    }
                    fs.writeFileSync(
                      `./data/${pathParsed.name}.json`,
                      jsonStr || finalData
                    );
                  });
                }
              )
              .on("error", (err: any) => {
                console.log("Error: " + err.message);
              });
          }
        });
      }
    }
  } catch {
    ErrorFiles.push(file);
  }
});
