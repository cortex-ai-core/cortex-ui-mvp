export function hasRole(userRole: string, allowed: string[]) {
  return allowed.includes(userRole);
}
