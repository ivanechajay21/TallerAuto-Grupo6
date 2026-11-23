import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, updateSettings } from '../servicios/configuracionServicio';
import type { Settings } from '../servicios/configuracionServicio';
import { writeBrandCache } from '../lib/marca';

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (patch: Partial<Settings>) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getSettings();
      setSettings(loaded);
      writeBrandCache(loaded.tallerNombre, loaded.tallerLogo);
      if (loaded.tallerNombre?.trim()) {
        document.title = `${loaded.tallerNombre.trim()} | SIGTM`;
      }
    } catch {
      setSettings(null);
      setError('No se pudo cargar la configuración del taller.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!settings) {
      throw new Error('La configuración aún no está cargada. Recarga la página e inténtalo de nuevo.');
    }
    const updated = await updateSettings({ ...settings, ...patch });
    setSettings(updated);
    writeBrandCache(updated.tallerNombre, updated.tallerLogo);
    if (updated.tallerNombre?.trim()) {
      document.title = `${updated.tallerNombre.trim()} | SIGTM`;
    }
    setError(null);
    return updated;
  };

  const value = useMemo(
    () => ({ settings, loading, error, refresh, save }),
    [settings, loading, error]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useShopSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useShopSettings debe usarse dentro de SettingsProvider');
  return ctx;
}

/**
 * Variante tolerante para pantallas que también deben renderizar en pruebas o
 * fuera del proveedor (por ejemplo, una vista previa aislada del comprobante).
 */
export function useOptionalShopSettings() {
  return useContext(SettingsContext);
}
