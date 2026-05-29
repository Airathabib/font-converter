import React from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { FontConverter } from '@/components/FontConverter/FontConverter';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';

interface AppProps {
  onPickDirectory?: () => Promise<string[] | null>;
  onPickOutputPath?: () => Promise<string | null>;
}

export const App: React.FC<AppProps> = ({
  onPickDirectory,
  onPickOutputPath,
}) => {
  return (
    <ThemeProvider>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          transition: 'background 0.3s',
          color: 'var(--text)',
        }}
      >
        {/* Кнопка темы в правом верхнем углу */}
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 100,
          }}
        >
          <ThemeToggle />
        </div>

        <FontConverter
          onPickDirectory={onPickDirectory}
          onPickOutputPath={onPickOutputPath}
        />
      </div>
    </ThemeProvider>
  );
};

export default App;
