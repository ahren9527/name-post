/** Mux PNG frames into a QuickTime MOV with 32-bit alpha (codec 'png '). */

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n & 0xffff);
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0);
  return b;
}

function i16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setInt16(0, n);
  return b;
}

function fourcc(s: string): Uint8Array {
  return new Uint8Array([
    s.charCodeAt(0),
    s.charCodeAt(1),
    s.charCodeAt(2),
    s.charCodeAt(3),
  ]);
}

function zeros(n: number): Uint8Array {
  return new Uint8Array(n);
}

function box(type: string, ...payloads: Uint8Array[]): Uint8Array {
  const payload = concat(payloads);
  return concat([u32(8 + payload.length), fourcc(type), payload]);
}

function pascal32(text: string): Uint8Array {
  const buf = new Uint8Array(32);
  const str = text.slice(0, 31);
  buf[0] = str.length;
  for (let i = 0; i < str.length; i++) buf[i + 1] = str.charCodeAt(i) & 0xff;
  return buf;
}

function identityMatrix(): Uint8Array {
  return concat([
    u32(0x00010000),
    u32(0),
    u32(0),
    u32(0),
    u32(0x00010000),
    u32(0),
    u32(0),
    u32(0),
    u32(0x40000000),
  ]);
}

function cString(text: string): Uint8Array {
  const out = new Uint8Array(text.length + 1);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export function muxPngMov(opts: {
  frames: Uint8Array[];
  width: number;
  height: number;
  timescale: number;
  sampleDuration: number;
}): Uint8Array {
  const { frames, width, height, timescale, sampleDuration } = opts;
  if (frames.length === 0) throw new Error("没有可封装的帧");
  const n = frames.length;
  const duration = n * sampleDuration;

  const ftyp = box("ftyp", fourcc("qt  "), u32(0x00000200), fourcc("qt  "));

  const payloadSize = frames.reduce((s, f) => s + f.length, 0);
  const mdatHeader = 8;
  const mdatSize = mdatHeader + payloadSize;
  const chunkOffset = ftyp.length + mdatHeader;

  const pngDesc = concat([
    u32(86),
    fourcc("png "),
    zeros(6),
    u16(1),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    u32(0x00000400),
    u16(width),
    u16(height),
    u32(0x00480000),
    u32(0x00480000),
    u32(0),
    u16(1),
    pascal32("PNG"),
    u16(32),
    i16(-1),
  ]);

  const stsd = box("stsd", u32(0), u32(1), pngDesc);
  const stts = box("stts", u32(0), u32(1), u32(n), u32(sampleDuration));
  const stsc = box("stsc", u32(0), u32(1), u32(1), u32(n), u32(1));
  const stsz = box("stsz", u32(0), u32(0), u32(n), ...frames.map((f) => u32(f.length)));
  const stco = box("stco", u32(0), u32(1), u32(chunkOffset));
  const stss = box("stss", u32(0), u32(n), ...frames.map((_, i) => u32(i + 1)));
  const stbl = box("stbl", stsd, stts, stsc, stsz, stco, stss);

  const dref = box(
    "dref",
    u32(0),
    u32(1),
    concat([u32(12), fourcc("url "), u32(1)]),
  );
  const dinf = box("dinf", dref);
  const vmhd = box("vmhd", u32(1), u16(0), u16(0), u16(0), u16(0));
  const minf = box("minf", vmhd, dinf, stbl);

  const hdlr = box(
    "hdlr",
    u32(0),
    fourcc("mhlr"),
    fourcc("vide"),
    u32(0),
    u32(0),
    u32(0),
    cString("VideoHandler"),
  );
  const mdhd = box(
    "mdhd",
    u32(0),
    u32(0),
    u32(0),
    u32(timescale),
    u32(duration),
    u16(0x55c4),
    u16(0),
  );
  const mdia = box("mdia", mdhd, hdlr, minf);

  const tkhd = box(
    "tkhd",
    u32(0x00000007),
    u32(0),
    u32(0),
    u32(1),
    u32(0),
    u32(duration),
    zeros(8),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    identityMatrix(),
    u32(width << 16),
    u32(height << 16),
  );
  const trak = box("trak", tkhd, mdia);

  const mvhd = box(
    "mvhd",
    u32(0),
    u32(0),
    u32(0),
    u32(timescale),
    u32(duration),
    u32(0x00010000),
    u16(0x0100),
    zeros(10),
    identityMatrix(),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
    u32(2),
  );
  const moov = box("moov", mvhd, trak);

  const mdat = concat([u32(mdatSize), fourcc("mdat"), ...frames]);
  return concat([ftyp, mdat, moov]);
}

export function movTimebase(fps: number): { timescale: number; sampleDuration: number } {
  if (Math.abs(fps - 29.97) < 0.05) return { timescale: 30000, sampleDuration: 1001 };
  if (fps === 25) return { timescale: 25, sampleDuration: 1 };
  if (fps === 30) return { timescale: 30, sampleDuration: 1 };
  const timescale = Math.round(fps * 1000);
  return { timescale, sampleDuration: 1000 };
}
