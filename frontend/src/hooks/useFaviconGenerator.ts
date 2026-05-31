import { useState, useCallback, useEffect } from 'react';
import {
	generateFavicons,
	FaviconFormat,
	FaviconResponse
} from '@/services/api';

export interface UseFaviconGeneratorReturn {
	selectedFile: File | null;
	previewUrl: string | null;
	isGenerating: boolean;
	error: string | null;
	generatedResponse: FaviconResponse | null;
	handleFileSelect: (file: File | null) => void;
	handleGenerate: (formats: FaviconFormat[], appName: string) => Promise<void>;
	handleDownloadZip: () => void;
	handleCopyHtml: () => Promise<boolean>;
	reset: () => void;
}

export function useFaviconGenerator(): UseFaviconGeneratorReturn {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [generatedResponse, setGeneratedResponse] =
		useState<FaviconResponse | null>(null);

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const handleFileSelect = useCallback(
		(file: File | null) => {
			setSelectedFile(file);
			setError(null);
			setGeneratedResponse(null);

			if (file) {
				setPreviewUrl(URL.createObjectURL(file));
			} else {
				if (previewUrl) URL.revokeObjectURL(previewUrl);
				setPreviewUrl(null);
			}
		},
		[previewUrl]
	);

	const handleGenerate = useCallback(
		async (formats: FaviconFormat[], appName: string) => {
			if (!selectedFile) {
				setError('Выберите изображение');
				return;
			}

			setIsGenerating(true);
			setError(null);

			try {
				const response = await generateFavicons(selectedFile, formats, appName);
				setGeneratedResponse(response);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Ошибка генерации');
			} finally {
				setIsGenerating(false);
			}
		},
		[selectedFile]
	);

	const handleDownloadZip = useCallback(() => {
		if (!generatedResponse?.zip) return;

		const { filename, data } = generatedResponse.zip;
		const link = document.createElement('a');
		link.href = `data:application/zip;base64,${data}`;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}, [generatedResponse]);

	const handleCopyHtml = useCallback(async () => {
		if (generatedResponse?.html) {
			await navigator.clipboard.writeText(generatedResponse.html);
			return true;
		}
		return false;
	}, [generatedResponse]);

	const reset = useCallback(() => {
		setSelectedFile(null);
		setError(null);
		setGeneratedResponse(null);
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			setPreviewUrl(null);
		}
	}, [previewUrl]);

	return {
		selectedFile,
		previewUrl,
		isGenerating,
		error,
		generatedResponse,
		handleFileSelect,
		handleGenerate,
		handleDownloadZip, //
		handleCopyHtml, //
		reset
	};
}
