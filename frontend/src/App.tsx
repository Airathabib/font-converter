// frontend/src/App.tsx
import React, { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { FontConverter } from '@/components/FontConverter/FontConverter';
import { FaviconConverter } from '@/components/FaviconConverter/FaviconConverter';
import { Tabs, TabId } from '@/components/Tabs/Tabs';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';

interface AppProps {
	onPickDirectory?: () => Promise<string[] | null>;
	onPickOutputPath?: () => Promise<string | null>;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
	{ id: 'fonts', label: 'Шрифты', icon: '🔤' },
	{ id: 'favicons', label: 'Фавиконки', icon: '🎨' }
];

export const App: React.FC<AppProps> = ({
	onPickDirectory,
	onPickOutputPath
}) => {
	const [activeTab, setActiveTab] = useState<TabId>('fonts');

	return (
		<ThemeProvider>
			<div
				style={{
					minHeight: '100vh',
					background: 'var(--bg)',
					transition: 'background 0.3s',
					color: 'var(--text)'
				}}
			>
				{/* Кнопка темы */}
				<div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
					<ThemeToggle />
				</div>

				{/* Вкладки */}
				<Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

				{/* Контент вкладки */}
				<div style={{ padding: '0 16px' }}>
					{activeTab === 'fonts' ? (
						<FontConverter
							onPickDirectory={onPickDirectory}
							onPickOutputPath={onPickOutputPath}
						/>
					) : (
						<FaviconConverter
							onPickDirectory={onPickDirectory}
							onPickOutputPath={onPickOutputPath}
						/>
					)}
				</div>
			</div>
		</ThemeProvider>
	);
};

export default App;
