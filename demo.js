#!/usr/bin/env node

import readlinePromises from "readline/promises";
import fs from "fs/promises";
import util from "util";
import {readStruct} from "./ArkSaveReader.js";

const rlp = readlinePromises.createInterface(process.stdin, process.stdout);
let answer = await rlp.question("Location of *.arkprofile or *.arktribe: ");
answer = answer.replaceAll('"', "");

let buffer = await fs.readFile(answer);

// Search for known top-level struct keys
let searchableBuffer = buffer.subarray(0, 0xFFF); // Only search near the beginning
for (let structKey of ["\x0A\x00\x00\x00TribeData", "\x0A\x00\x00\x00MyArkData", "\x0E\x00\x00\x00AscensionData", "\x07\x00\x00\x00MyData"]) {
    let index = searchableBuffer.indexOf(structKey);
    if (index >= 0) {
        var startOffset = index;
        break;
    }
}
if (typeof startOffset === "undefined") {
    throw "Unable to read data";
}

// Start reading 4 bytes before the string
let result = readStruct(buffer, startOffset);
console.log(util.inspect(result.value, {showHidden: false, depth: null, colors: true}));
console.log(`Size of struct: ${result.bytesRead} bytes`);

await rlp.question("Press Enter to exit...");
rlp.close();