import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexto/ContextoTema';
import { cn } from '../lib/utilidades';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:scale-105 hover:border-blue-300 hover:text-blue-600 active:scale-95',
        'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400',
        className
      )}
    >
      <span
        key={isDark ? 'sun' : 'moon'}
        className="animate-fade-in flex items-center justify-center"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
}