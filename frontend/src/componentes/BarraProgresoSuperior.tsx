import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utilidades';
import { subscribeNav, isNavActive } from './progresoNavegacion';

export default function TopProgressBar() {
  const [visible, setVisible] = useState(isNavActive());
  const [value, setValue] = useState(0);
  const location = useLocation();

  const run = useCallback((active: boolean) => {
    if (active) {
      setVisible(true);
      setValue(0);
      window.setTimeout(() => setValue(90), 40);
    } else {
      setValue(100);
      window.setTimeout(() => setVisible(false), 400);
    }
  }, []);

  useEffect(() => {
    return subscribeNav(() => run(isNavActive()));
  }, [run]);

  const pathname = location.pathname;
  useEffect(() => {
    run(true);
    window.setTimeout(() => run(false), 900);
  }, [pathname, run]);

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 top-0 z-[90] h-1', !visible && 'invisible')}>
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 shadow-[0_0_12px_rgba(59,130,246,0.7)] transition-[width] duration-300 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}