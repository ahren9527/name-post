import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { muxPngMov, movTimebase } from "../src/lib/nameplates/mov.ts";

// 1×1 fully transparent PNG
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const { timescale, sampleDuration } = movTimebase(29.97);
const bytes = muxPngMov({
  frames: [png, png],
  width: 1,
  height: 1,
  timescale,
  sampleDuration,
});
writeFileSync("/workspace/screenshots/qa-mux-tiny.mov", bytes);
console.log("size", bytes.length);
console.log("ftyp", String.fromCharCode(...bytes.subarray(4, 8)));
console.log("brand", String.fromCharCode(...bytes.subarray(8, 12)));
console.log("png sig at 28", [...bytes.subarray(28, 36)].map((n) => n.toString(16).padStart(2, "0")).join(" "));
const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", "/workspace/screenshots/qa-mux-tiny.mov"], {
  encoding: "utf8",
});
console.log(probe.stderr);
