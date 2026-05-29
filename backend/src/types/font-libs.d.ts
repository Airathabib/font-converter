// src/types/font-libs.d.ts

// ─────────────────────────────────────────────
// ttf2woff
// ─────────────────────────────────────────────
declare module 'ttf2woff' {
  export interface WoffConvertResult {
    buffer: ArrayBuffer;
  }

  export interface WoffOptions {
    metadata?: string;
    [key: string]: any;
  }

  /**
   * Конвертирует TTF (Uint8Array) в WOFF
   */
  function ttf2woff(data: Uint8Array, options?: WoffOptions): WoffConvertResult;

  export = ttf2woff;
}

// ─────────────────────────────────────────────
// ttf2woff2
// ─────────────────────────────────────────────
declare module 'ttf2woff2' {
  export interface Woff2Options {
    metadata?: string;
    [key: string]: any;
  }

  /**
   * Конвертирует TTF (Buffer) в WOFF2 (Buffer)
   */
  function ttf2woff2(buffer: Buffer, options?: Woff2Options): Buffer;

  export = ttf2woff2;
}
