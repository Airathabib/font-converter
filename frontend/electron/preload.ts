import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from './types/electron-types';

contextBridge.exposeInMainWorld('electron', {
  pickDirectory: async (): Promise<string[] | null> => {
    return ipcRenderer.invoke('dialog:pickDirectory');
  },
  pickOutputPath: async (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:pickOutput');
  },
  onConvertProgress: (callback: (data: any) => void) => {
    return () => {};
  },
} satisfies ElectronAPI);
