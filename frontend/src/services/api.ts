export type FontFormat = 'woff' | 'woff2';
export type SourceFormat = 'ttf' | 'otf' | 'woff'; // 👈 Новые форматы

export interface ConvertedFile {
	filename: string;
	mimeType: string;
	data: string;
	sourceFormat: SourceFormat;
}

export interface ConvertResponse {
	originalName: string;
	sourceFormat: SourceFormat;
	files: Partial<Record<FontFormat, ConvertedFile>>;
}

export interface ApiError {
	error: string;
	details?: string;
}

// ─────────────────────────────────────────────
//  Типы для фавиконок
// ─────────────────────────────────────────────
export type FaviconFormat =
	| 'favicon.ico'
	| 'apple-touch-icon.png'
	| 'android-chrome-192x192.png'
	| 'android-chrome-512x512.png'
	| 'favicon-16x16.png'
	| 'favicon-32x32.png'
	| 'mstile-150x150.png'
	| 'safari-pinned-tab.svg';

export interface FaviconResponse {
	zip: {
		filename: string;
		data: string; // base64
	};
	html: string;
	manifest: string;
}

const API_BASE = 'http://127.0.0.1:3001/api';

export async function convertFont(
	file: File,
	formats: FontFormat[] = ['woff', 'woff2']
): Promise<ConvertResponse> {
	const formData = new FormData();
	formData.append('font', file);
	formData.append('formats', JSON.stringify(formats));

	const response = await fetch(`${API_BASE}/convert`, {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		const error: ApiError = await response.json().catch(() => ({
			error: 'Ошибка сети'
		}));
		throw new Error(error.details || error.error || 'Неизвестная ошибка');
	}

	return response.json();
}

export async function generateFavicons(
	file: File,
	formats: FaviconFormat[] = [
		'favicon.ico',
		'apple-touch-icon.png',
		'android-chrome-192x192.png',
		'android-chrome-512x512.png'
	],
	appName: string = 'My App'
): Promise<FaviconResponse> {
	const formData = new FormData();
	formData.append('image', file);
	formData.append('formats', JSON.stringify(formats));
	formData.append('appName', appName);

	const response = await fetch(`${API_BASE}/generate-favicons`, {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		const error: ApiError = await response.json().catch(() => ({
			error: 'Ошибка сети'
		}));
		throw new Error(error.details || error.error || 'Неизвестная ошибка');
	}

	// 1. Получаем ZIP как blob и конвертируем в base64
	const blob = await response.blob();
	const base64 = await new Promise<string>(resolve => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result as string;
			// Убираем префикс "data:application/zip;base64,"
			resolve(result.split(',')[1]);
		};
		reader.readAsDataURL(blob);
	});

	// 2. Получаем HTML и manifest из заголовков ответа (если бэкенд их передаёт)
	//    Или генерируем заглушки, если бэкенд ещё не реализован полностью
	const html =
		response.headers.get('X-Favicon-HTML') ||
		`<link rel="icon" type="image/x-icon" href="/favicon.ico">`;

	const manifest = response.headers.get('X-Favicon-Manifest') || '{}';

	// 3. Возвращаем структурированный ответ
	return {
		zip: {
			filename: `${appName.replace(/[^a-z0-9]/gi, '_')}-favicons.zip`,
			data: base64
		},
		html,
		manifest
	};
}
