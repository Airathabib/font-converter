const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_APP = path.join(ROOT, 'dist-manual');
const APP_NAME = 'Font Converter Pro';

console.log('🚀 Начинаем ручную сборку...');

// 1. Очищаем папку сборки
if (fs.existsSync(DIST_APP)) {
	fs.removeSync(DIST_APP);
}
fs.ensureDirSync(DIST_APP);

// 2. Копируем собранный фронтенд
console.log('📦 Копируем фронтенд...');
fs.copySync(path.join(ROOT, 'dist'), path.join(DIST_APP, 'dist'));

// 3. Копируем скомпилированный Electron-код
console.log('⚙️ Копируем Electron-код...');
fs.copySync(
	path.join(ROOT, 'dist-electron'),
	path.join(DIST_APP, 'dist-electron')
);

// 4. Создаём package.json для продакшена

console.log('📝 Создаём package.json...');
const pkg = {
	name: 'font-converter-pro',
	version: '1.0.0',
	main: 'dist-electron/main.js',
	scripts: { start: 'electron .' },
	dependencies: {
		// 🔹 Фронтенд
		react: '^18.2.0',
		'react-dom': '^18.2.0',
		axios: '^1.6.0',
		'form-data': '^4.0.0',

		// 🔹 Встроенный бэкенд (Express)
		express: '^4.18.2',
		cors: '^2.8.5',
		multer: '^1.4.5-lts.1',

		// 🔹 Конвертация шрифтов
		ttf2woff: '^2.0.2',
		ttf2woff2: '^5.0.0',

		// 🔹 Генерация фавиконок (НОВОЕ!)
		favicons: '^7.2.0',
		sharp: '^0.33.2',
		'adm-zip': '^0.5.10',

		// 🔹 Electron runtime
		electron: '^28.0.0'
	}
};
fs.writeFileSync(
	path.join(DIST_APP, 'package.json'),
	JSON.stringify(pkg, null, 2)
);

// 5. Устанавливаем зависимости
console.log('📦 Устанавливаем зависимости...');
execSync('npm install --omit=dev --no-audit --no-fund', {
	cwd: DIST_APP,
	stdio: 'inherit'
});

// 6. Копируем иконку
console.log('🎨 Копируем иконку...');
fs.ensureDirSync(path.join(DIST_APP, 'build'));
const iconSrc = path.join(ROOT, 'build', 'icon.ico');
if (fs.existsSync(iconSrc)) {
	fs.copySync(iconSrc, path.join(DIST_APP, 'build', 'icon.ico'));
}

// 7. Создаём .bat-лаунчер
console.log('🔧 Создаём лаунчер...');
const bat = `@echo off
cd /d "%~dp0"
npx electron .
`;
fs.writeFileSync(path.join(DIST_APP, 'start.bat'), bat);

console.log('\n✅ Сборка завершена!');
console.log(`📁 Папка приложения: ${DIST_APP}`);
console.log(`🚀 Запуск: ${path.join(DIST_APP, 'start.bat')}`);
