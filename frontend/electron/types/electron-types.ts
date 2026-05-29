export interface ElectronAPI {
  pickDirectory: () => Promise<string[] | null>;
  pickOutputPath: () => Promise<string | null>;
  onConvertProgress: (callback: (data: any) => void) => () => void;
}
