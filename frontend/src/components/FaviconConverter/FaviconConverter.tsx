import React, { useState } from 'react';
import { useFaviconGenerator } from '@/hooks/useFaviconGenerator';
import { FaviconFormat } from '@/services/api';
import cls from './FaviconConverter.module.scss';

interface Props {
	onPickDirectory?: () => Promise<string[] | null>;
	onPickOutputPath?: () => Promise<string | null>;
}

const AVAILABLE_FORMATS: {
	id: FaviconFormat;
	label: string;
	description: string;
}[] = [
	{
		id: 'favicon.ico',
		label: 'Favicon ICO',
		description: 'Классический .ico для браузеров'
	},
	{
		id: 'apple-touch-icon.png',
		label: 'Apple Touch',
		description: 'Для иконок iOS'
	},
	{
		id: 'android-chrome-192x192.png',
		label: 'Android 192',
		description: 'Chrome Android'
	},
	{
		id: 'android-chrome-512x512.png',
		label: 'Android 512',
		description: 'PWA / Home screen'
	},
	{
		id: 'favicon-32x32.png',
		label: '32*32 PNG',
		description: 'Стандартный размер'
	},
	{
		id: 'mstile-150x150.png',
		label: 'Windows Tile',
		description: 'Для Windows Start'
	}
];

export const FaviconConverter: React.FC<Props> = () => {
	const {
		selectedFile,
		previewUrl,
		isGenerating,
		error,
		generatedResponse,
		handleFileSelect,
		handleGenerate,
		handleDownloadZip,
		handleCopyHtml,
		reset
	} = useFaviconGenerator();

	const [formats, setFormats] = useState<FaviconFormat[]>([
		'favicon.ico',
		'apple-touch-icon.png',
		'android-chrome-192x192.png',
		'android-chrome-512x512.png'
	]);
	const [appName, setAppName] = useState('');
	const [inputKey, setInputKey] = useState(0); // 🔹 Для сброса file input

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		handleFileSelect(file);
		if (file) {
			setAppName(file.name.replace(/\.[^.]+$/, ''));
		}
	};

	const handleReset = () => {
		reset();
		if (formats.length === 0) {
			setFormats([
				'favicon.ico',
				'apple-touch-icon.png',
				'android-chrome-192x192.png',
				'android-chrome-512x512.png'
			]);
		}
		setInputKey(prev => prev + 1); // 🔹 Пересоздаёт input
	};

	const handleFormatToggle = (format: FaviconFormat) => {
		setFormats(prev =>
			prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
		);
	};

	const handleGenerateClick = async () => {
		await handleGenerate(formats, appName || 'My App');
	};

	const handleCopyClick = async () => {
		const success = await handleCopyHtml();
		if (success) {
			alert('✅ HTML скопирован!');
		}
	};

	return (
		<div className={cls.container}>
			<h2 className={cls.title}>🎨 Генератор фавиконок</h2>

			<section className={cls.section}>
				<label className={cls.label}>1. Выберите изображение:</label>
				<input
					type='file'
					accept='.png,.jpg,.jpeg,.svg,.webp'
					onChange={handleFileInputChange}
					key={inputKey} // 🔹 Ключ для сброса выбора файла
					className={cls.fileInput}
				/>
				{selectedFile && previewUrl && (
					<div>
						<p className={cls.filename}>✓ {selectedFile.name}</p>
						<div className={cls.preview}>
							<img
								src={previewUrl}
								alt='Preview'
								className={cls.preview__image}
							/>
						</div>
					</div>
				)}
			</section>

			<section className={cls.section}>
				<label className={cls.label}>
					2. Название приложения (для манифеста):
				</label>
				<input
					type='text'
					value={appName}
					onChange={e => setAppName(e.target.value)}
					placeholder='Например: My Website'
					className={cls.textInput}
				/>
			</section>

			<section className={cls.section}>
				<label className={cls.label}>3. Выберите форматы:</label>
				<div className={cls.formatGrid}>
					{AVAILABLE_FORMATS.map(fmt => (
						<label key={fmt.id} className={cls.formatCard}>
							<input
								type='checkbox'
								checked={formats.includes(fmt.id)}
								onChange={() => handleFormatToggle(fmt.id)}
							/>
							<div className={cls.formatCard__content}>
								<span className={cls.formatCard__label}>{fmt.label}</span>
								<span className={cls.formatCard__desc}>{fmt.description}</span>
							</div>
						</label>
					))}
				</div>
			</section>

			<button
				onClick={handleGenerateClick}
				disabled={isGenerating || !selectedFile || formats.length === 0}
				className={`${cls.btn} ${!selectedFile || formats.length === 0 ? cls.btnDisabled : ''}`}
			>
				{isGenerating ? '⏳ Генерация...' : '🚀 Сгенерировать'}
			</button>

			{error && <p className={cls.error}>❌ {error}</p>}

			{generatedResponse && (
				<section className={cls.results}>
					<h3 className={cls.resultsTitle}>✅ Готово!</h3>
					<div className={cls.resultItem}>
						<span className={cls.formatBadge}>📦 ZIP архив</span>
						<span className={cls.resultFilename}>
							{generatedResponse.zip.filename}
						</span>
						<button onClick={handleDownloadZip} className={cls.downloadBtn}>
							⬇️ Скачать
						</button>
					</div>
					{generatedResponse.html && (
						<div className={cls.htmlSection}>
							<div className={cls.htmlHeader}>
								<span>📋 HTML-код для &lt;head&gt;</span>
								<button onClick={handleCopyClick} className={cls.copyBtn}>
									Копировать
								</button>
							</div>
							<pre className={cls.htmlCode}>
								<code>{generatedResponse.html}</code>
							</pre>
						</div>
					)}
					<button onClick={handleReset} className={cls.resetBtn}>
						🗑️ Начать заново
					</button>
				</section>
			)}
		</div>
	);
};
