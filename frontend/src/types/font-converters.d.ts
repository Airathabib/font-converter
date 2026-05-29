declare module 'ttf2woff' {
  function ttf2woff(data: Uint8Array): { buffer: ArrayBuffer };
  export = ttf2woff;
}
declare module 'ttf2woff2' {
  function ttf2woff2(buffer: Buffer): Buffer;
  export = ttf2woff2;
}
