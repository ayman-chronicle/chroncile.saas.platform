"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Tenant {
  id: string;
  name: string;
  slug: string;
  stripeSubscriptionStatus: string | null;
  createdAt: string;
  userCount: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  authProvider: string;
  createdAt: string;
}

interface TenantsResponse {
  tenants: Tenant[];
  total: number;
  error?: string;
}

interface UsersResponse {
  users: User[];
}

// ── Environment selector ──────────────────────────────────────────────────────

interface Environment {
  id: string;
  name: string;
  type: string;
  status: string;
}

function useEnvironments() {
  const { data } = useSWR<Environment[]>("/api/environments", fetcher);
  return (data ?? []).filter((e) => e.status === "RUNNING");
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  envId,
  tenant,
  onClose,
}: {
  envId: string;
  tenant: Tenant;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ loginUrl?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/${envId}/tenants/${tenant.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error ?? "Invite failed" });
      else setResult({ loginUrl: data.loginUrl });
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 panel">
        <div className="panel__header">
          <span className="panel__title">Invite to {tenant.name}</span>
          <button onClick={onClose} className="text-tertiary hover:text-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="panel__content">
          {!result?.loginUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input font-mono text-sm"
                  placeholder="user@chronicle-labs.com"
                />
              </div>
              <div>
                <label className="label block mb-1.5">Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-sm"
                  placeholder="John Smith"
                />
              </div>
              <p className="text-xs text-tertiary">
                Creates a Google OAuth account linked to <strong className="text-secondary">{tenant.name}</strong>.
                Share the login link so they can sign in with their Chronicle Labs Google account.
              </p>
              {result?.error && (
                <div className="flex items-center gap-2">
                  <span className="status-dot status-dot--critical" />
                  <span className="text-xs text-critical">{result.error}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn btn--secondary btn--sm">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn--primary btn--sm disabled:opacity-40">
                  {loading ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot--nominal" />
                <span className="text-sm text-nominal">Account created successfully</span>
              </div>
              <div>
                <span className="label block mb-1.5">Share this login link</span>
                <div className="flex items-center gap-2 bg-elevated border border-border-default rounded-sm px-3 py-2">
                  <span className="font-mono text-xs text-data flex-1 truncate">{result.loginUrl}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.loginUrl!)}
                    className="text-tertiary hover:text-primary shrink-0"
                    title="Copy"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-tertiary">
                They can sign in at this URL using their <strong className="text-secondary">{email}</strong> Google account.
              </p>
              <button onClick={onClose} className="btn btn--primary btn--sm w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Users drawer ──────────────────────────────────────────────────────────────

function UsersDrawer({
  envId,
  tenant,
  onClose,
  onInvite,
}: {
  envId: string;
  tenant: Tenant;
  onClose: () => void;
  onInvite: () => void;
}) {
  const { data } = useSWR<UsersResponse>(
    `/api/admin/${envId}/tenants/${tenant.id}/users`,
    fetcher
  );
  const users = data?.users ?? [];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-void/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm h-full bg-surface border-l border-border-dim flex flex-col">
        <div className="panel__header">
          <div>
            <span className="panel__title">{tenant.name}</span>
            <p className="font-mono text-[10px] text-tertiary mt-0.5">{tenant.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onInvite} className="btn btn--primary btn--sm">Invite</button>
            <button onClick={onClose} className="text-tertiary hover:text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border-dim bg-elevated">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="label block mb-0.5">Users</span>
              <span className="font-mono text-lg text-primary">{users.length}</span>
            </div>
            <div>
              <span className="label block mb-0.5">Subscription</span>
              <span className={`font-mono text-sm ${tenant.stripeSubscriptionStatus === "active" ? "text-nominal" : "text-caution"}`}>
                {tenant.stripeSubscriptionStatus ?? "free"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <span className="label">Members</span>
          </div>
          {users.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-tertiary">No users yet</div>
          ) : (
            <div className="divide-y divide-border-dim">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors">
                  <div className="w-8 h-8 rounded-full bg-data-bg border border-data-dim flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs text-data">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {u.name && <p className="text-sm text-primary truncate">{u.name}</p>}
                    <p className="font-mono text-xs text-tertiary truncate">{u.email}</p>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-disabled shrink-0">
                    {u.authProvider}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const envs = useEnvironments();
  const [selectedEnvId, setSelectedEnvId] = useState<string>("");
  const [expandedTenant, setExpandedTenant] = useState<Tenant | null>(null);
  const [inviteTenant, setInviteTenant] = useState<Tenant | null>(null);
  const [search, setSearch] = useState("");

  const activeEnvId = selectedEnvId || envs.find((e) => e.type === "PRODUCTION")?.id || envs[0]?.id || "";

  const { data, isLoading } = useSWR<TenantsResponse>(
    activeEnvId ? `/api/admin/${activeEnvId}/tenants` : null,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const filtered = (data?.tenants ?? []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {expandedTenant && activeEnvId && !inviteTenant && (
        <UsersDrawer
          envId={activeEnvId}
          tenant={expandedTenant}
          onClose={() => setExpandedTenant(null)}
          onInvite={() => setInviteTenant(expandedTenant)}
        />
      )}
      {inviteTenant && activeEnvId && (
        <InviteModal
          envId={activeEnvId}
          tenant={inviteTenant}
          onClose={() => setInviteTenant(null)}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-sans font-semibold">Tenants & Organizations</h1>
            <p className="text-xs text-tertiary mt-1">
              Manage orgs and users across environments
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Environment selector */}
            <select
              value={activeEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="input text-xs font-mono py-1.5 w-44"
            >
              {envs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="panel">
            <div className="panel__content">
              <div className="metric">
                <span className="metric__label">Total Orgs</span>
                <span className="metric__value metric__value--data">
                  {isLoading ? "—" : (data?.total ?? 0)}
                </span>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel__content">
              <div className="metric">
                <span className="metric__label">Total Users</span>
                <span className="metric__value metric__value--data">
                  {isLoading ? "—" : (data?.tenants ?? []).reduce((s, t) => s + t.userCount, 0)}
                </span>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel__content">
              <div className="metric">
                <span className="metric__label">Active Subscriptions</span>
                <span className="metric__value metric__value--nominal">
                  {isLoading ? "—" : (data?.tenants ?? []).filter((t) => t.stripeSubscriptionStatus === "active").length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Organizations</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orgs..."
                  className="input font-mono text-xs pl-8 py-1.5 w-48"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-border-dim">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-sm bg-elevated animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-elevated rounded animate-pulse w-32" />
                    <div className="h-2.5 bg-elevated rounded animate-pulse w-20" />
                  </div>
                  <div className="h-3 bg-elevated rounded animate-pulse w-8" />
                  <div className="h-3 bg-elevated rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          ) : data?.error ? (
            <div className="panel__content">
              <div className="flex items-center gap-2">
                <span className="status-dot status-dot--caution" />
                <span className="text-xs text-caution">{data.error}</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="panel__content text-center py-8 text-xs text-tertiary">
              {search ? `No orgs matching "${search}"` : "No organizations found"}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Slug</th>
                  <th>Users</th>
                  <th>Subscription</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedTenant(tenant)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-sm bg-data-bg border border-data-dim flex items-center justify-center shrink-0">
                          <span className="font-mono text-xs text-data font-semibold">
                            {tenant.name[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-primary font-medium">{tenant.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs">{tenant.slug}</span>
                    </td>
                    <td>
                      <span className="font-mono text-sm text-primary">{tenant.userCount}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        tenant.stripeSubscriptionStatus === "active" ? "badge--nominal" : "badge--neutral"
                      }`}>
                        {tenant.stripeSubscriptionStatus ?? "free"}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setExpandedTenant(tenant); setInviteTenant(tenant); }}
                          className="btn btn--secondary btn--sm"
                        >
                          Invite
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
