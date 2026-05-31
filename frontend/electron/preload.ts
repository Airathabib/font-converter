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
		const channel = 'convert:progress';

		ipcRenderer.on(channel, (_, data) => callback(data));

		return () => ipcRenderer.removeListener(channel, callback);
	}
} satisfies ElectronAPI);
