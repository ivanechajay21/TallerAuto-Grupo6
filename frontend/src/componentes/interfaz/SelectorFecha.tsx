import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utilidades';
import { estiloCampo } from './Formulario';

type ModoSelectorFecha = 'date' | 'month';

interface SelectorFechaProps {
  value: string;
  onChange: (value: string) => void;
  mode?: ModoSelectorFecha;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  min?: string;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const pad = (value: number) => String(value).padStart(2, '0');

function parseValue(value: string, mode: ModoSelectorFecha): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, mode === 'date' ? day || 1 : 1);
}

function serialize(date: Date, mode: ModoSelectorFecha) {
  return mode === 'month'
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function etiqueta(value: string, mode: ModoSelectorFecha) {
  const date = parseValue(value, mode);
  if (!date) return '';
  return mode === 'month'
    ? `${MESES_CORTOS[date.getMonth()]} ${date.getFullYear()}`
    : `${date.getDate()} ${MESES_CORTOS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function SelectorFecha({
  value,
  onChange,
  mode = 'date',
  placeholder,
  className,
  disabled,
  id,
  min,
}: SelectorFechaProps) {
  const generatedId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [view, setView] = useState(() => parseValue(value, mode) ?? new Date());

  const selectedDate = parseValue(value, mode);
  const minDate = parseValue(min ?? '', 'date');

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const height = mode === 'month' ? 330 : 380;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const below = rect.bottom + 8;
    const top = below + height > window.innerHeight - 12 ? Math.max(12, rect.top - height - 8) : below;
    setPosition({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    setView(parseValue(value, mode) ?? new Date());
    updatePosition();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, mode]);

  const select = (date: Date) => {
    onChange(serialize(date, mode));
    setOpen(false);
  };

  const isDisabledDate = (date: Date) => {
    if (!minDate) return false;
    const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const minimum = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
    return candidate < minimum;
  };

  const renderDays = () => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const cells: Array<{ date: Date; current: boolean }> = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(year, month, i - offset + 1);
      cells.push({ date, current: date.getMonth() === month });
    }
    return cells;
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id ?? generatedId}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) updatePosition();
          setOpen((current) => !current);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          estiloCampo,
          'flex items-center justify-between gap-3 text-left',
          !value && 'text-slate-400 dark:text-slate-500',
          className,
        )}
      >
        <span className="truncate">{value ? etiqueta(value, mode) : placeholder ?? (mode === 'month' ? 'Seleccionar mes' : 'Seleccionar fecha')}</span>
        <CalendarDays size={16} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Selector de fecha"
          className="fixed z-[90] w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15 animate-dialog-in dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear() - (mode === 'month' ? 1 : 0), view.getMonth() - (mode === 'month' ? 0 : 1), 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={mode === 'month' ? 'Año anterior' : 'Mes anterior'}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {mode === 'month' ? view.getFullYear() : `${MESES_LARGOS[view.getMonth()]} ${view.getFullYear()}`}
            </p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear() + (mode === 'month' ? 1 : 0), view.getMonth() + (mode === 'month' ? 0 : 1), 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={mode === 'month' ? 'Año siguiente' : 'Mes siguiente'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {mode === 'month' ? (
            <div className="grid grid-cols-3 gap-2">
              {MESES_CORTOS.map((month, index) => {
                const selected = selectedDate?.getFullYear() === view.getFullYear() && selectedDate?.getMonth() === index;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => select(new Date(view.getFullYear(), index, 1))}
                    className={cn(
                      'rounded-xl px-2 py-2.5 text-sm font-medium capitalize transition',
                      selected
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {DIAS.map((day) => (
                  <span key={day} className="py-1 text-center text-[10px] font-bold uppercase text-slate-400">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderDays().map(({ date, current }) => {
                  const selected = selectedDate
                    && date.getFullYear() === selectedDate.getFullYear()
                    && date.getMonth() === selectedDate.getMonth()
                    && date.getDate() === selectedDate.getDate();
                  const today = new Date();
                  const isToday = date.getFullYear() === today.getFullYear()
                    && date.getMonth() === today.getMonth()
                    && date.getDate() === today.getDate();
                  const disabledDate = isDisabledDate(date);
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={disabledDate}
                      onClick={() => select(date)}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition',
                        selected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                          : current
                            ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                            : 'text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800/50',
                        isToday && !selected && 'ring-1 ring-inset ring-blue-300 dark:ring-blue-500/50',
                        disabledDate && 'cursor-not-allowed opacity-30',
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => select(new Date())}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              {mode === 'month' ? 'Este mes' : 'Hoy'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
