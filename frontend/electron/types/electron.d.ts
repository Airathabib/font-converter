import { ElectronAPI } from './electron-types';

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
