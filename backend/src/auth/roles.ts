/**
 * Simuni's original spec talks about OWNER / MANAGER / AGENT. Better Auth's
 * `organization` plugin ships with its own role strings ("owner" / "admin" /
 * "member"). Rather than fighting the plugin, we map 1:1 onto it so its
 * built-in permission checks (e.g. "only owners can remove members") line up
 * with Simuni's own rules.
 */
export enum SimuniRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
}

const TO_ORG_ROLE: Record<SimuniRole, string> = {
  [SimuniRole.OWNER]: 'owner',
  [SimuniRole.MANAGER]: 'admin',
  [SimuniRole.AGENT]: 'member',
};

const FROM_ORG_ROLE: Record<string, SimuniRole> = {
  owner: SimuniRole.OWNER,
  admin: SimuniRole.MANAGER,
  member: SimuniRole.AGENT,
};

export function toOrgRole(role: SimuniRole): string {
  return TO_ORG_ROLE[role];
}

export function fromOrgRole(orgRole: string): SimuniRole {
  return FROM_ORG_ROLE[orgRole] ?? SimuniRole.AGENT;
}
