import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, updateSettings } from '../services/settingsService';
import type { Settings } from '../services/settingsService';

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (patch: Partial<Settings>) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setSettings(await getSettings());
    } catch {
      /* sesión caducada o sin permisos */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (patch: Partial<Settings>) => {
    const updated = await updateSettings({ ...(settings ?? {}), ...patch });
    setSettings(updated);
    return updated;
  };

  const value = useMemo(() => ({ settings, loading, refresh, save }), [settings, loading]);

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