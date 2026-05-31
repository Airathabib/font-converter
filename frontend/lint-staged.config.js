module.exports = {
	// TypeScript файлы: только проверка типов (без eslint --fix, чтобы не убивалось)
	'*.{ts,tsx}': [
		() => 'npx tsc --noEmit' // Проверка типов
		//  Раскомментируйте, если eslint работает стабильно:
		// () => 'npx eslint --fix',
	],

	//  JavaScript конфиги: только prettier
	'*.{js,cjs,mjs}': ['npx prettier --write --ignore-unknown'],

	//  JSON: форматирование
	'*.json': ['npx prettier --write --ignore-unknown'],

	//  SCSS/CSS: форматирование
	'*.{scss,css}': ['npx prettier --write --ignore-unknown']
};
