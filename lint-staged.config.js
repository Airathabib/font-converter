// lint-staged.config.js
module.exports = {
	// Для всех TS/TSX файлов запускаем ESLint с авто-исправлением
	'*.{ts,tsx}': ['eslint --fix', () => 'tsc --noEmit'],

	// Для JS файлов (конфиги)
	'*.{js,cjs,mjs}': ['eslint --fix'],

	// Для JSON файлов (форматирование)
	'*.json': ['prettier --write'],
};
