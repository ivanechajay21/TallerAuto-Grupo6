/** Etiquetas en español para los roles internos del sistema. */
export const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_MANAGER: 'Gerente',
  ROLE_RECEPTIONIST: 'Recepcionista',
  ROLE_MECHANIC: 'Mecánico',
  ROLE_STOREKEEPER: 'Almacenero',
};

/**
 * Devuelve el nombre visible del rol. Los roles internos se traducen y los
 * roles personalizados se presentan sin el prefijo técnico `ROLE_`.
 */
export function roleLabel(roleName?: string | null): string {
  if (!roleName) return 'Sin rol';
  return ROLE_LABELS[roleName] || roleName.replace('ROLE_', '').replaceAll('_', ' ');
}
