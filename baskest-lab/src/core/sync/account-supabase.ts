// EVENT LAB v0.4 — compte, organisations, membres et invitations (Supabase Auth + RPC).
//
// STATUT : NON TESTÉ contre un vrai projet Supabase (aucun projet n'existe encore).
// Les règles côté serveur (rôles, RLS, suppression de compte) sont testées localement
// par npm run db:test ; cette couche ne fait qu'appeler l'API.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemberRole } from './types';

export interface AccountSession {
  userId: string;
  email: string | null;
}
export interface MembershipInfo {
  organizationId: string;
  organizationName: string;
  city: string | null;
  role: MemberRole;
  functionLabel: string | null;
  displayName: string;
  rowVersion: number;
}
export interface MemberInfo {
  userId: string;
  role: MemberRole;
  functionLabel: string | null;
  displayName: string;
  rowVersion: number;
  createdAt: string;
}
export interface InvitationInfo {
  id: string;
  email: string;
  role: MemberRole;
  functionLabel: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}
export interface PendingInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  role: MemberRole;
  functionLabel: string | null;
  expiresAt: string;
}
export type DeletionOutcome = 'organisation_supprimee' | 'bloquant' | 'adhesion_retiree';
export interface DeletionPreviewRow {
  organizationId: string;
  organizationName: string;
  myRole: MemberRole;
  otherMembers: number;
  otherOwners: number;
  outcome: DeletionOutcome;
}

export interface AccountApi {
  getSession(): Promise<AccountSession | null>;
  onChange(cb: (s: AccountSession | null) => void): () => void;
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  /** 'session' : connecté tout de suite ; 'confirmation' : un e-mail de confirmation a été envoyé. */
  signUp(email: string, password: string, redirectTo: string): Promise<'session' | 'confirmation'>;
  signOut(): Promise<void>;
  myMemberships(): Promise<MembershipInfo[]>;
  createOrganization(name: string, displayName: string): Promise<string>;
  members(orgId: string): Promise<MemberInfo[]>;
  invitations(orgId: string): Promise<InvitationInfo[]>;
  invite(orgId: string, email: string, role: MemberRole, functionLabel: string | null): Promise<void>;
  revokeInvitation(id: string): Promise<void>;
  setMemberRole(orgId: string, userId: string, role: MemberRole, rowVersion: number): Promise<void>;
  updateMember(orgId: string, userId: string, patch: { displayName?: string; functionLabel?: string | null }, rowVersion: number): Promise<void>;
  removeMember(orgId: string, userId: string): Promise<void>;
  myInvitations(): Promise<PendingInvitation[]>;
  acceptInvitation(id: string, displayName: string | null): Promise<string>;
  deletionPreview(): Promise<DeletionPreviewRow[]>;
  deleteMyAccount(): Promise<void>;
  deleteOrganization(orgId: string, confirmName: string): Promise<void>;
}

/** Messages lisibles pour les erreurs courantes (le serveur d'authentification répond en anglais). */
export function frenchAuthError(message: string): string {
  const m = message.toLowerCase();
  if (/invalid login credentials/.test(m)) return 'Adresse e-mail ou mot de passe incorrect.';
  if (/email not confirmed/.test(m)) return 'Adresse e-mail pas encore confirmée : ouvrez le lien reçu par e-mail.';
  if (/already registered|already exists/.test(m)) return 'Un compte existe déjà avec cette adresse : connectez-vous.';
  if (/rate limit|too many|security purposes/.test(m)) return 'Trop de tentatives : réessayez dans quelques minutes.';
  if (/password should be|weak password|at least/.test(m)) return 'Mot de passe trop faible : au moins 8 caractères, en mélangeant lettres et chiffres.';
  if (/failed to fetch|network|load failed/.test(m)) return 'Serveur injoignable : vérifiez la connexion.';
  if (/signups not allowed|signup.*disabled/.test(m)) return 'Les inscriptions sont fermées sur ce serveur.';
  return message;
}

const fail = (e: { message?: string } | null | undefined): never => {
  throw new Error(frenchAuthError(e?.message || 'Erreur du serveur'));
};

export class SupabaseAccountApi implements AccountApi {
  constructor(private db: SupabaseClient) {}

  async getSession(): Promise<AccountSession | null> {
    const { data } = await this.db.auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, email: u.email ?? null } : null;
  }
  onChange(cb: (s: AccountSession | null) => void): () => void {
    const { data } = this.db.auth.onAuthStateChange((_evt, session) => cb(session?.user ? { userId: session.user.id, email: session.user.email ?? null } : null));
    return () => data.subscription.unsubscribe();
  }
  async sendMagicLink(email: string, redirectTo: string) {
    const { error } = await this.db.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    if (error) fail(error);
  }
  async signInWithPassword(email: string, password: string) {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) fail(error);
  }
  async signUp(email: string, password: string, redirectTo: string) {
    const { data, error } = await this.db.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (error) fail(error);
    return data.session ? 'session' : 'confirmation';
  }
  async signOut() {
    const { error } = await this.db.auth.signOut();
    if (error) fail(error);
  }

  async myMemberships(): Promise<MembershipInfo[]> {
    const s = await this.getSession();
    if (!s) return [];
    const { data, error } = await this.db.from('memberships').select('role, function_label, display_name, row_version, organization:organizations(id, name, city)').eq('user_id', s.userId);
    if (error) fail(error);
    type Row = { role: MemberRole; function_label: string | null; display_name: string; row_version: number; organization: { id: string; name: string; city: string | null } | { id: string; name: string; city: string | null }[] | null };
    return ((data ?? []) as unknown as Row[])
      .map((r) => ({ r, o: Array.isArray(r.organization) ? r.organization[0] : r.organization }))
      .filter((x) => x.o)
      .map(({ r, o }) => ({ organizationId: o!.id, organizationName: o!.name, city: o!.city, role: r.role, functionLabel: r.function_label, displayName: r.display_name, rowVersion: r.row_version }))
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName, 'fr'));
  }
  async createOrganization(name: string, displayName: string): Promise<string> {
    const { data, error } = await this.db.rpc('create_organization', { p_name: name, p_display_name: displayName || null });
    if (error) fail(error);
    return data as string;
  }
  async members(orgId: string): Promise<MemberInfo[]> {
    const { data, error } = await this.db.from('memberships').select('user_id, role, function_label, display_name, row_version, created_at').eq('organization_id', orgId).order('created_at');
    if (error) fail(error);
    return ((data ?? []) as { user_id: string; role: MemberRole; function_label: string | null; display_name: string; row_version: number; created_at: string }[]).map((r) => ({ userId: r.user_id, role: r.role, functionLabel: r.function_label, displayName: r.display_name, rowVersion: r.row_version, createdAt: r.created_at }));
  }
  async invitations(orgId: string): Promise<InvitationInfo[]> {
    const { data, error } = await this.db.from('invitations').select('id, email, role, function_label, created_at, expires_at, accepted_at, revoked_at').eq('organization_id', orgId).order('created_at', { ascending: false });
    if (error) fail(error);
    return ((data ?? []) as { id: string; email: string; role: MemberRole; function_label: string | null; created_at: string; expires_at: string; accepted_at: string | null; revoked_at: string | null }[]).map((r) => ({ id: r.id, email: r.email, role: r.role, functionLabel: r.function_label, createdAt: r.created_at, expiresAt: r.expires_at, acceptedAt: r.accepted_at, revokedAt: r.revoked_at }));
  }
  async invite(orgId: string, email: string, role: MemberRole, functionLabel: string | null) {
    const { error } = await this.db.from('invitations').insert({ organization_id: orgId, email: email.trim().toLowerCase(), role, function_label: functionLabel || null });
    if (error) fail(error.code === '23505' ? { message: 'Une invitation est déjà en attente pour cette adresse.' } : error);
  }
  async revokeInvitation(id: string) {
    const { error } = await this.db.from('invitations').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) fail(error);
  }
  async setMemberRole(orgId: string, userId: string, role: MemberRole, rowVersion: number) {
    const { data, error } = await this.db.from('memberships').update({ role, row_version: rowVersion }).eq('organization_id', orgId).eq('user_id', userId).select('user_id');
    if (error) fail(error);
    if (!data?.length) fail({ message: 'Modification refusée (droits insuffisants).' });
  }
  async updateMember(orgId: string, userId: string, patch: { displayName?: string; functionLabel?: string | null }, rowVersion: number) {
    const body: Record<string, unknown> = { row_version: rowVersion };
    if (patch.displayName !== undefined) body.display_name = patch.displayName;
    if (patch.functionLabel !== undefined) body.function_label = patch.functionLabel || null;
    const { data, error } = await this.db.from('memberships').update(body).eq('organization_id', orgId).eq('user_id', userId).select('user_id');
    if (error) fail(error);
    if (!data?.length) fail({ message: 'Modification refusée (droits insuffisants).' });
  }
  async removeMember(orgId: string, userId: string) {
    const { data, error } = await this.db.from('memberships').delete().eq('organization_id', orgId).eq('user_id', userId).select('user_id');
    if (error) fail(error);
    if (!data?.length) fail({ message: 'Retrait refusé (droits insuffisants).' });
  }
  async myInvitations(): Promise<PendingInvitation[]> {
    const { data, error } = await this.db.rpc('my_invitations');
    if (error) fail(error);
    return ((data ?? []) as { id: string; organization_id: string; organization_name: string; role: MemberRole; function_label: string | null; expires_at: string }[]).map((r) => ({ id: r.id, organizationId: r.organization_id, organizationName: r.organization_name, role: r.role, functionLabel: r.function_label, expiresAt: r.expires_at }));
  }
  async acceptInvitation(id: string, displayName: string | null): Promise<string> {
    const { data, error } = await this.db.rpc('accept_invitation', { p_invitation: id, p_display_name: displayName || null });
    if (error) fail(error);
    return data as string;
  }
  async deletionPreview(): Promise<DeletionPreviewRow[]> {
    const { data, error } = await this.db.rpc('account_deletion_preview');
    if (error) fail(error);
    return ((data ?? []) as { organization_id: string; organization_name: string; my_role: MemberRole; other_members: number; other_owners: number; outcome: DeletionOutcome }[]).map((r) => ({ organizationId: r.organization_id, organizationName: r.organization_name, myRole: r.my_role, otherMembers: r.other_members, otherOwners: r.other_owners, outcome: r.outcome }));
  }
  async deleteMyAccount() {
    const { error } = await this.db.rpc('delete_my_account', { p_confirm: 'SUPPRIMER' });
    if (error) fail(error);
    // Le jeton d'accès reste valide jusqu'à son expiration : on ferme la session locale tout de suite.
    await this.db.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
  async deleteOrganization(orgId: string, confirmName: string) {
    const { error } = await this.db.rpc('delete_organization', { p_org: orgId, p_confirm_name: confirmName });
    if (error) fail(error);
  }
}
