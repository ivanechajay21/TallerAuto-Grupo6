import { useState } from 'react';
import { cn } from '../lib/utilidades';

export type Side = 'L' | 'R';

interface ZoneShape {
  type: 'rect' | 'ellipse' | 'path';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  d?: string;
}

export interface VehicleZone {
  code: string;
  label: string;
  side: Side | 'B';
  shapes: ZoneShape[];
  badge: { x: number; y: number };
}

export const DAMAGE_TYPES = [
  'Rayón',
  'Golpe',
  'Abolladura',
  'Rotura',
  'Desgaste',
  'Falta de pieza',
  'Otro',
] as const;

export const SEVERITIES = [
  { value: 'LEVE', label: 'Leve', dot: 'bg-emerald-500', active: 'border-emerald-500 bg-emerald-500 text-white', idle: 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-400' },
  { value: 'MODERADO', label: 'Moderado', dot: 'bg-amber-500', active: 'border-amber-500 bg-amber-500 text-white', idle: 'border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-400' },
  { value: 'GRAVE', label: 'Grave', dot: 'bg-red-500', active: 'border-red-500 bg-red-500 text-white', idle: 'border-red-200 bg-red-50 text-red-600 hover:border-red-400' },
] as const;

const VB_W = 360;
const VB_H = 160;

export const VEHICLE_ZONES: VehicleZone[] = [
  {
    code: 'PARA_FRONT',
    label: 'Parachoques delantero',
    side: 'B',
    shapes: [{ type: 'rect', x: 10, y: 86, w: 32, h: 34 }],
    badge: { x: 22, y: 102 },
  },
  {
    code: 'FAROS',
    label: 'Faros',
    side: 'B',
    shapes: [{ type: 'rect', x: 16, y: 68, w: 42, h: 22 }],
    badge: { x: 34, y: 78 },
  },
  {
    code: 'CAPO',
    label: 'Capó',
    side: 'B',
    shapes: [{ type: 'rect', x: 54, y: 50, w: 60, h: 24 }],
    badge: { x: 82, y: 62 },
  },
  {
    code: 'ESPEJO_IZQ',
    label: 'Espejo izquierdo',
    side: 'L',
    shapes: [{ type: 'rect', x: 116, y: 40, w: 18, h: 16 }],
    badge: { x: 125, y: 46 },
  },
  {
    code: 'ESPEJO_DER',
    label: 'Espejo derecho',
    side: 'R',
    shapes: [{ type: 'rect', x: 116, y: 40, w: 18, h: 16 }],
    badge: { x: 125, y: 46 },
  },
  {
    code: 'PARABRISAS',
    label: 'Parabrisas',
    side: 'B',
    shapes: [{ type: 'rect', x: 122, y: 26, w: 36, h: 26 }],
    badge: { x: 138, y: 36 },
  },
  {
    code: 'TECHO',
    label: 'Techo',
    side: 'B',
    shapes: [{ type: 'rect', x: 158, y: 16, w: 82, h: 14 }],
    badge: { x: 198, y: 22 },
  },
  {
    code: 'PD_IZQ',
    label: 'Puerta delantera izquierda',
    side: 'L',
    shapes: [{ type: 'rect', x: 112, y: 50, w: 76, h: 66 }],
    badge: { x: 148, y: 84 },
  },
  {
    code: 'PD_DER',
    label: 'Puerta delantera derecha',
    side: 'R',
    shapes: [{ type: 'rect', x: 112, y: 50, w: 76, h: 66 }],
    badge: { x: 148, y: 84 },
  },
  {
    code: 'PT_IZQ',
    label: 'Puerta trasera izquierda',
    side: 'L',
    shapes: [{ type: 'rect', x: 188, y: 50, w: 76, h: 66 }],
    badge: { x: 226, y: 84 },
  },
  {
    code: 'PT_DER',
    label: 'Puerta trasera derecha',
    side: 'R',
    shapes: [{ type: 'rect', x: 188, y: 50, w: 76, h: 66 }],
    badge: { x: 226, y: 84 },
  },
  {
    code: 'MALETERA',
    label: 'Maletera',
    side: 'B',
    shapes: [{ type: 'rect', x: 270, y: 36, w: 58, h: 30 }],
    badge: { x: 298, y: 48 },
  },
  {
    code: 'LUCES_TRASERAS',
    label: 'Luces traseras',
    side: 'B',
    shapes: [{ type: 'rect', x: 296, y: 60, w: 40, h: 24 }],
    badge: { x: 318, y: 70 },
  },
  {
    code: 'PARA_REAR',
    label: 'Parachoques trasero',
    side: 'B',
    shapes: [{ type: 'rect', x: 306, y: 82, w: 40, h: 38 }],
    badge: { x: 326, y: 98 },
  },
  {
    code: 'LLANTAS',
    label: 'Llantas',
    side: 'B',
    shapes: [
      { type: 'ellipse', cx: 81, cy: 118, rx: 24, ry: 24 },
      { type: 'ellipse', cx: 276, cy: 118, rx: 24, ry: 24 },
    ],
    badge: { x: 81, y: 118 },
  },
  {
    code: 'PARTE_INFERIOR',
    label: 'Parte inferior',
    side: 'B',
    shapes: [{ type: 'rect', x: 42, y: 118, w: 276, h: 14 }],
    badge: { x: 180, y: 124 },
  },
];

export const ZONE_MAP = new Map(VEHICLE_ZONES.map((z) => [z.code, z]));

interface OverlayProps {
  shapes: ZoneShape[];
  label: string;
  selected: boolean;
  hovered: boolean;
  hasDamage: boolean;
  onClick: () => void;
}

function ZoneOverlay({ shapes, label, selected, hovered, hasDamage, onClick }: OverlayProps) {
  const cls = cn(
    'cursor-pointer transition-all duration-200',
    selected
      ? 'fill-blue-500/40 stroke-blue-600 stroke-[2] filter drop-shadow'
      : hovered
        ? 'fill-blue-400/25 stroke-blue-500 stroke-[1.5]'
        : hasDamage
          ? 'fill-red-500/25 stroke-red-500 stroke-[1.5]'
          : 'fill-slate-500/5 stroke-slate-400/50 hover:fill-blue-400/15'
  );
  const common = {
    className: cls,
    strokeWidth: selected ? 2 : 1.2,
    strokeDasharray: selected ? undefined : '3 2',
    vectorEffect: 'non-scaling-stroke' as const,
    onClick,
  };
  return (
    <g className="cursor-pointer">
      <title>{label}</title>
      {shapes.map((s, i) =>
        s.type === 'rect' ? (
          <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} ry={4} {...common} />
        ) : (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />
        )
      )}
    </g>
  );
}

// Componente para Rueda de 5 Aspas Estilo Plano Técnico Automotriz (Exacto a Imagen 2)
function TechnicalWheel({ cx, cy }: { cx: number; cy: number }) {
  // Coordenadas calculadas para los 5 agujeros de las aspas en estrella
  const holes = [0, 72, 144, 216, 288].map((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * 9,
      y: cy + Math.sin(rad) * 9,
    };
  });

  return (
    <g>
      {/* Sombra dentro del guardabarros */}
      <path
        d={`M ${cx - 26} ${cy} A 26 26 0 0 1 ${cx + 26} ${cy} Z`}
        fill="#334155"
        opacity="0.3"
      />
      {/* Neumático Exterior */}
      <circle cx={cx} cy={cy} r={22} fill="#64748b" stroke="#1e293b" strokeWidth="1.5" />
      {/* Banda Interior del Neumático */}
      <circle cx={cx} cy={cy} r={17} fill="#94a3b8" stroke="#1e293b" strokeWidth="1.25" />
      {/* Disco de Rin Metálico */}
      <circle cx={cx} cy={cy} r={15.5} fill="#f8fafc" stroke="#1e293b" strokeWidth="1.25" />
      {/* 5 Agujeros circulares de las aspas tipo estrella (Imagen 2) */}
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={3.2} fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
      ))}
      {/* Tapa Central del Rin */}
      <circle cx={cx} cy={cy} r={4.5} fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={1.5} fill="#1e293b" />
    </g>
  );
}

interface VehicleInspectorProps {
  side: Side;
  onSideChange: (side: Side) => void;
  counts: Record<string, number>;
  selectedZone: string | null;
  onSelectZone: (code: string) => void;
}

export default function VehicleInspector({
  side,
  onSideChange,
  counts,
  selectedZone,
  onSelectZone,
}: VehicleInspectorProps) {
  const [hover, setHover] = useState<string | null>(null);
  const visible = VEHICLE_ZONES.filter((z) => z.side === 'B' || z.side === side);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const withHover = (code: string) => ({
    onMouseEnter: () => setHover(code),
    onMouseLeave: () => setHover(null),
  });

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onSideChange('L')}
            className={cn(
              'rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200',
              side === 'L'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm shadow-black/5 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Lado Izquierdo (Conductor)
          </button>
          <button
            type="button"
            onClick={() => onSideChange('R')}
            className={cn(
              'rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200',
              side === 'R'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm shadow-black/5 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            Lado Derecho (Copiloto)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-slate-500 dark:text-slate-400">Daños marcados:</span>
          <span
            className={cn(
              'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold transition-all',
              total > 0
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/30 ring-2 ring-red-200 animate-pulse'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            )}
          >
            {total}
          </span>
        </div>
      </div>

      {/* Esquema Técnico SVG del Vehículo (Exacto a Imagen 2) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-4 shadow-sm">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 1. SOMBRA SUAVE BAJO EL VEHÍCULO */}
          <ellipse cx="180" cy="140" rx="155" ry="5" fill="rgba(15, 23, 42, 0.15)" />
          <ellipse cx="81" cy="140" rx="26" ry="3.5" fill="rgba(15, 23, 42, 0.35)" />
          <ellipse cx="276" cy="140" rx="26" ry="3.5" fill="rgba(15, 23, 42, 0.35)" />

          {/* 2. CARROCERÍA COMPLETA (SILUETA SEDÁN IMAGEN 2) */}
          <g>
            {/* Cuerpo principal del automóvil */}
            <path
              d="M 22 118
                 L 14 114
                 C 10 106, 10 96, 14 88
                 C 18 80, 26 76, 44 70
                 C 68 62, 92 56, 112 52
                 L 156 26
                 C 180 20, 218 20, 246 22
                 C 272 26, 304 42, 338 58
                 L 338 68
                 C 342 74, 346 86, 346 98
                 C 346 108, 340 114, 334 118
                 L 302 118
                 A 26 26 0 0 0 250 118
                 L 107 118
                 A 26 26 0 0 0 55 118
                 L 22 118
                 Z"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>

          {/* 3. ÁREA DE CRISTALES Y VENTANAS (3 PANELES EXACTOS A IMAGEN 2) */}
          <g stroke="#1e293b" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round">
            {/* Marco General de Ventanas */}
            <path
              d="M 120 50 
                 L 154 28 
                 L 248 26 
                 L 306 50 
                 Z"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.25"
            />

            {/* Ventana Delantera */}
            <path
              d="M 122 50 L 152 28 L 186 26 L 186 50 Z"
              fill="#94a3b8"
            />

            {/* Ventana Trasera */}
            <path
              d="M 194 26 L 246 27 L 252 50 L 194 50 Z"
              fill="#94a3b8"
            />

            {/* Ventana Triangular Trasera / Custodia */}
            <path
              d="M 256 29 L 302 50 L 258 50 Z"
              fill="#94a3b8"
            />

            {/* Pilar B Central Negro */}
            <rect x="186" y="26" width="8" height="24" fill="#1e293b" stroke="#1e293b" strokeWidth="0.5" />
          </g>

          {/* 4. LÍNEAS DE CARROCERÍA, PUERTAS Y PANELES (EXACTO A IMAGEN 2) */}
          <g stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Línea de Capó */}
            <path d="M 112 52 L 52 66" />
            <path d="M 32 76 C 56 70, 84 66, 110 64" strokeWidth="0.9" />

            {/* Línea de Cintura / Hombro Longitudinal (Desde el faro hasta el faro trasero) */}
            <path d="M 58 70 C 130 64, 230 64, 338 66" strokeWidth="1" />

            {/* Corte de Puerta Delantera */}
            <path d="M 112 52 L 108 84 L 105 118" />

            {/* Corte entre Puerta Delantera y Trasera */}
            <path d="M 190 50 L 186 86 L 184 118" />

            {/* Corte de Puerta Trasera (con curva sobre guardabarros trasero) */}
            <path d="M 252 50 C 262 58, 268 72, 268 84 C 268 98, 258 112, 246 118" />

            {/* Línea de Bisel Inferior de Puertas (Side skirt line) */}
            <path d="M 106 108 L 184 108 L 246 108" strokeWidth="1" />

            {/* Manijas de Puertas */}
            <rect x="156" y="62" width="18" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
            <rect x="232" y="62" width="18" height="4" rx="2" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />

            {/* Espejo Retrovisor con Soporte Triangular */}
            <path d="M 124 50 L 122 44 L 132 44 L 128 50 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.1" />

            {/* Rejilla Frontal Inferior / Parachoques */}
            <path d="M 14 88 C 10 94, 10 102, 14 110" strokeWidth="1.2" />
            <ellipse cx="28" cy="104" rx="7" ry="4.5" fill="#f8fafc" stroke="#1e293b" strokeWidth="1" />
            <circle cx="26" cy="104" r="2.5" fill="#94a3b8" />

            {/* Faro Delantero Elongado */}
            <path
              d="M 16 86 L 46 72 L 56 74 L 26 92 Z"
              fill="#f8fafc"
              stroke="#1e293b"
              strokeWidth="1.2"
            />
            <path d="M 20 87 L 44 76" stroke="#1e293b" strokeWidth="0.8" />

            {/* Luz Trasera Geométrica (Imagen 2) */}
            <path
              d="M 296 68 L 338 60 L 338 76 L 306 82 Z"
              fill="#94a3b8"
              stroke="#1e293b"
              strokeWidth="1.2"
            />
            <path d="M 338 76 C 326 84, 316 94, 310 106" strokeWidth="1" />
          </g>

          {/* 5. RUEDAS DE 5 ASPAS TÉCNICAS (EXACTAS A IMAGEN 2) */}
          <TechnicalWheel cx={81} cy={118} />
          <TechnicalWheel cx={276} cy={118} />

          {/* 6. ZONAS INTERACTIVAS (OVERLAYS DE INSPECCIÓN) */}
          <g>
            {visible
              .filter((z) => z.code !== 'LLANTAS')
              .map((z) => (
                <ZoneOverlay
                  key={z.code}
                  {...withHover(z.code)}
                  shapes={z.shapes}
                  label={z.label}
                  selected={selectedZone === z.code}
                  hovered={hover === z.code}
                  hasDamage={(counts[z.code] || 0) > 0}
                  onClick={() => onSelectZone(z.code)}
                />
              ))}
            {visible
              .filter((z) => z.code === 'LLANTAS')
              .map((z) => (
                <ZoneOverlay
                  key={z.code}
                  {...withHover(z.code)}
                  shapes={z.shapes}
                  label={z.label}
                  selected={selectedZone === z.code}
                  hovered={hover === z.code}
                  hasDamage={(counts[z.code] || 0) > 0}
                  onClick={() => onSelectZone(z.code)}
                />
              ))}
          </g>

          {/* 7. MARCADORES E INSIGNIAS DE DAÑOS REGISTRADOS */}
          <g>
            {visible.map((z) => {
              const count = counts[z.code] || 0;
              if (count === 0) return null;
              const sel = selectedZone === z.code;
              return (
                <g key={z.code} className="transition-transform duration-200 hover:scale-110">
                  <circle
                    cx={z.badge.x}
                    cy={z.badge.y}
                    r={10}
                    fill="none"
                    stroke={sel ? '#2563eb' : '#ef4444'}
                    strokeWidth={4}
                    opacity={0.35}
                    className="animate-pulse"
                  />
                  <circle
                    cx={z.badge.x}
                    cy={z.badge.y}
                    r={8.5}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  <text
                    x={z.badge.x}
                    y={z.badge.y + 3.5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="800"
                    fill="#ffffff"
                  >
                    {count > 99 ? '99+' : count}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Indicadores Direccionales */}
          <text x={8} y={16} fontSize="9.5" fontWeight="700" fill="#94a3b8" letterSpacing="0.8">
            FRONTAL →
          </text>
          <text x={VB_W - 8} y={16} textAnchor="end" fontSize="9.5" fontWeight="700" fill="#94a3b8" letterSpacing="0.8">
            ← TRASERA
          </text>
        </svg>
      </div>

      {/* Grid de Selección de Partes */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {VEHICLE_ZONES.map((z) => {
          const count = counts[z.code] || 0;
          const sel = selectedZone === z.code;
          return (
            <button
              key={z.code}
              type="button"
              onClick={() => {
                if (z.side !== 'B') onSideChange(z.side as Side);
                onSelectZone(z.code);
              }}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all duration-200',
                sel
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : count > 0
                    ? 'border-red-200 bg-red-50/80 text-red-600 hover:border-red-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10'
              )}
            >
              <span className="truncate">{z.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    sel ? 'bg-white dark:bg-slate-900/25 text-white' : 'bg-red-500 text-white'
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
