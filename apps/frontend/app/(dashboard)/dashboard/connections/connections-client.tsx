"use client";

import { useEffect, useState, useCallback } from "react";

interface ConnectionData {
  id: string;
  provider: string;
  status: string;
  pipedreamAuthId?: string | null;
  metadata: {
    workspace_id?: string;
    workspace_name?: string;
    account_name?: string;
    admin_email?: string;
    region?: string;
    connected_at?: string;
    connected_via?: string;
  } | null;
  createdAt: Date;
}

interface PipedreamApp {
  id: string;
  name_slug: string;
  name: string;
  auth_type: string;
  description?: string;
  img_src?: string;
  categories?: string | string[];
}

interface DeployedTrigger {
  id: string;
  deploymentId: string;
  triggerId: string;
  connectionId: string;
  provider: string;
  status: string;
  active: boolean;
  createdAt: string;
}

interface ConnectionsClientProps {
  connections: ConnectionData[];
  intercomConnection: ConnectionData | null;
  successMessage?: string;
  errorMessage?: string;
  pipedreamSuccess?: boolean;
  pipedreamError?: boolean;
  pipedreamApp?: string;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "crm", label: "CRM" },
  { id: "communication", label: "Communication" },
  { id: "developer-tools", label: "Dev Tools" },
  { id: "marketing", label: "Marketing" },
  { id: "productivity", label: "Productivity" },
];

export function ConnectionsClient({
  connections,
  intercomConnection,
  successMessage,
  errorMessage,
  pipedreamSuccess,
  pipedreamError,
  pipedreamApp,
}: ConnectionsClientProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [pipedreamApps, setPipedreamApps] = useState<PipedreamApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [deployedTriggers, setDeployedTriggers] = useState<DeployedTrigger[]>([]);
  const [isPipedreamConfigured, setIsPipedreamConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllApps, setShowAllApps] = useState(false);

  useEffect(() => {
    if (successMessage === "intercom") {
      setToastMessage("Successfully connected to Intercom");
      setToastType("success");
      setShowToast(true);
    } else if (pipedreamSuccess && pipedreamApp) {
      setToastMessage(`Successfully connected to ${pipedreamApp}`);
      setToastType("success");
      setShowToast(true);
      window.location.href = "/dashboard/connections";
    } else if (pipedreamError) {
      setToastMessage("Connection failed - please try again");
      setToastType("error");
      setShowToast(true);
    } else if (errorMessage) {
      const errorMessages: Record<string, string> = {
        invalid_state: "Invalid state - please try again",
        state_expired: "Session expired - please try again",
        token_exchange_failed: "Token exchange failed",
        configuration_error: "Configuration error",
        database_error: "Database error - please try again",
        access_denied: "Access denied - authorization cancelled",
      };
      setToastMessage(errorMessages[errorMessage] || `Error: ${errorMessage}`);
      setToastType("error");
      setShowToast(true);
    }
  }, [successMessage, errorMessage, pipedreamSuccess, pipedreamError, pipedreamApp]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    async function fetchApps() {
      try {
        const response = await fetch("/api/pipedream/apps?limit=200");
        if (response.ok) {
          const data = await response.json();
          setPipedreamApps(data.data || []);
        } else if (response.status === 500) {
          setIsPipedreamConfigured(false);
        }
      } catch (error) {
        console.error("Failed to fetch Pipedream apps:", error);
        setIsPipedreamConfigured(false);
      } finally {
        setLoadingApps(false);
      }
    }
    fetchApps();
  }, []);

  useEffect(() => {
    async function fetchTriggers() {
      try {
        const response = await fetch("/api/pipedream/triggers/deployed");
        if (response.ok) {
          const data = await response.json();
          setDeployedTriggers(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch deployed triggers:", error);
      }
    }
    if (isPipedreamConfigured) {
      fetchTriggers();
    }
  }, [isPipedreamConfigured]);

  const handleConnectPipedream = useCallback(async (app: string) => {
    setConnectingApp(app);
    try {
      const tokenResponse = await fetch("/api/pipedream/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get connect token");
      }

      const { connectLinkUrl } = await tokenResponse.json();
      window.location.href = connectLinkUrl;
    } catch (error) {
      console.error("Failed to initiate Pipedream connection:", error);
      setToastMessage("Failed to start connection flow");
      setToastType("error");
      setShowToast(true);
      setConnectingApp(null);
    }
  }, []);

  const handleConnectIntercom = () => {
    window.location.href = "/api/connections/intercom/authorize";
  };

  const handleDeleteTrigger = async (deploymentId: string) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;

    try {
      const response = await fetch(`/api/pipedream/triggers/deployed/${deploymentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeployedTriggers(prev => prev.filter(t => t.deploymentId !== deploymentId));
        setToastMessage("Trigger deleted successfully");
        setToastType("success");
        setShowToast(true);
      } else {
        throw new Error("Failed to delete trigger");
      }
    } catch (error) {
      console.error("Failed to delete trigger:", error);
      setToastMessage("Failed to delete trigger");
      setToastType("error");
      setShowToast(true);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getConnection = (provider: string) => {
    return connections.find(c => c.provider === provider && c.status === "active");
  };

  const filteredApps = pipedreamApps.filter((app) => {
    if (app.name_slug === "intercom") return false;

    const categoriesStr = Array.isArray(app.categories) 
      ? app.categories.join(" ").toLowerCase()
      : (typeof app.categories === "string" ? app.categories.toLowerCase() : "");

    const matchesSearch =
      searchQuery === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.name_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoriesStr.includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "connected" && getConnection(app.name_slug)) ||
      categoriesStr.includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const displayedApps = showAllApps ? filteredApps : filteredApps.slice(0, 11);
  const hasMoreApps = filteredApps.length > 11;
  const activeConnections = connections.filter(c => c.status === "active").length;

  const renderAppCard = (app: PipedreamApp | { name_slug: string; name: string; description?: string }) => {
    const connection = getConnection(app.name_slug);
    const isConnected = !!connection;
    const isConnecting = connectingApp === app.name_slug;

    return (
      <div key={app.name_slug} className={`panel transition-all ${isConnected ? "border-nominal-dim" : ""}`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isConnected ? "bg-nominal-bg border-nominal-dim" : "bg-elevated border-border-dim"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 border flex items-center justify-center text-xs font-bold ${
              isConnected 
                ? "border-nominal bg-nominal-bg text-nominal" 
                : "border-border-default bg-surface text-tertiary"
            }`}>
              {app.name_slug.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-primary">{app.name}</div>
              <div className="text-xs text-tertiary">
                {Array.isArray((app as PipedreamApp).categories) 
                  ? ((app as PipedreamApp).categories as string[]).slice(0, 1).join("")
                  : "Integration"}
              </div>
            </div>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <div className="status-dot status-dot--nominal" />
              <span className="font-mono text-xs text-nominal">Online</span>
            </div>
          )}
        </div>

        <div className="p-4">
          {isConnected ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-tertiary tracking-wide uppercase mb-1">Connected to</div>
                <div className="text-sm font-medium text-primary">
                  {connection.metadata?.account_name || connection.metadata?.workspace_name || "Account"}
                </div>
              </div>
              {connection.metadata?.connected_at && (
                <div className="font-mono text-xs text-tertiary tabular-nums">
                  Since {formatDate(connection.metadata.connected_at)}
                </div>
              )}
              <button
                onClick={() => handleConnectPipedream(app.name_slug)}
                disabled={isConnecting}
                className="btn btn--secondary w-full"
              >
                {isConnecting ? "Reconnecting..." : "Reconnect"}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-tertiary mb-4 line-clamp-2">
                {app.description || `Connect ${app.name} to capture events.`}
              </p>
              <button
                onClick={() => handleConnectPipedream(app.name_slug)}
                disabled={isConnecting}
                className="btn btn--primary w-full"
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  "Connect"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 border transition-all ${
          toastType === "success" 
            ? "bg-nominal-bg border-nominal-dim text-nominal" 
            : "bg-critical-bg border-critical-dim text-critical"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`status-dot ${toastType === "success" ? "status-dot--nominal" : "status-dot--critical"}`} />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-tertiary tracking-wide uppercase mb-1">Integration Management</div>
          <h1 className="text-2xl font-semibold text-primary">Connections</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-elevated border border-border-dim">
            <div className={`status-dot ${activeConnections > 0 ? "status-dot--nominal" : "status-dot--offline"}`} />
            <span className="text-sm text-secondary">
              <span className="font-mono tabular-nums">{activeConnections}</span> active
            </span>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="panel">
        <div className={`flex items-center justify-between px-4 py-3 ${
          activeConnections > 0 ? "bg-nominal-bg border-b border-nominal-dim" : "bg-data-bg border-b border-data-dim"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`status-dot ${activeConnections > 0 ? "status-dot--nominal status-dot--pulse" : "status-dot--data"}`} />
            <span className={`text-sm font-medium ${activeConnections > 0 ? "text-nominal" : "text-data"}`}>
              {activeConnections > 0 ? "Integrations Operational" : "Awaiting Connections"}
            </span>
          </div>
        </div>
      </div>

      {/* Available Integrations */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Available Integrations</span>
          {isPipedreamConfigured && <span className="badge badge--neutral">Pipedream</span>}
        </div>

        {/* Search and Filter */}
        {isPipedreamConfigured && !loadingApps && (
          <div className="px-4 py-4 border-b border-border-dim space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAllApps(false);
                }}
                className="w-full pl-10 pr-3 py-2 bg-base border border-border-default text-sm placeholder:text-disabled focus:outline-none focus:border-data"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowAllApps(false);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border ${
                    selectedCategory === category.id
                      ? "bg-data text-base border-data"
                      : "bg-elevated text-secondary border-border-default hover:border-border-bright"
                  }`}
                >
                  {category.label}
                  {category.id === "connected" && activeConnections > 0 && (
                    <span className="ml-1.5 font-mono tabular-nums">{activeConnections}</span>
                  )}
                </button>
              ))}
            </div>

            {(searchQuery || selectedCategory !== "all") && (
              <div className="text-sm text-tertiary">
                <span className="font-mono tabular-nums">{filteredApps.length}</span> result{filteredApps.length !== 1 ? "s" : ""}
                {searchQuery && ` for "${searchQuery}"`}
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          {loadingApps ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-border-default rounded-full" />
                <div className="absolute top-0 left-0 w-12 h-12 border-2 border-data border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-sm text-tertiary mt-4">Loading integrations...</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Intercom */}
                <div className={`panel transition-all ${intercomConnection ? "border-nominal-dim" : ""}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${
                    intercomConnection ? "bg-nominal-bg border-nominal-dim" : "bg-elevated border-border-dim"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 border flex items-center justify-center text-xs font-bold ${
                        intercomConnection 
                          ? "border-nominal bg-nominal-bg text-nominal" 
                          : "border-border-default bg-surface text-tertiary"
                      }`}>
                        IC
                      </div>
                      <div>
                        <div className="text-sm font-medium text-primary">Intercom</div>
                        <div className="text-xs text-tertiary">Customer Messaging</div>
                      </div>
                    </div>
                    {intercomConnection && (
                      <div className="flex items-center gap-2">
                        <div className="status-dot status-dot--nominal" />
                        <span className="font-mono text-xs text-nominal">Online</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {intercomConnection ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-tertiary tracking-wide uppercase mb-1">Workspace</div>
                          <div className="text-sm font-medium text-primary">
                            {intercomConnection.metadata?.workspace_name || "Workspace"}
                          </div>
                        </div>
                        <div className="text-xs text-tertiary">
                          {intercomConnection.metadata?.admin_email}
                        </div>
                        <button onClick={handleConnectIntercom} className="btn btn--secondary w-full">
                          Reconnect
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-tertiary mb-4">
                          Capture conversations, events, and user data from Intercom.
                        </p>
                        <button onClick={handleConnectIntercom} className="btn btn--primary w-full">
                          Connect
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isPipedreamConfigured && pipedreamApps.length > 0 ? (
                  <>
                    {displayedApps.map((app) => renderAppCard(app))}

                    {filteredApps.length === 0 && (searchQuery || selectedCategory !== "all") && (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 border border-border-dim bg-elevated flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                        </div>
                        <div className="text-sm text-tertiary mb-2">No matches found</div>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                          }}
                          className="text-sm text-data hover:text-primary"
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                  </>
                ) : !isPipedreamConfigured && (
                  <div className="col-span-full panel">
                    <div className="flex items-center justify-between px-4 py-3 bg-caution-bg border-b border-caution-dim">
                      <div className="flex items-center gap-3">
                        <div className="status-dot status-dot--caution" />
                        <span className="text-sm font-medium text-caution">Pipedream not configured</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-tertiary">
                        Configure Pipedream credentials to enable additional integrations.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {isPipedreamConfigured && hasMoreApps && !searchQuery && selectedCategory === "all" && (
                <div className="mt-6 text-center">
                  <button onClick={() => setShowAllApps(!showAllApps)} className="btn btn--ghost">
                    {showAllApps ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        Show Less
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        Show All ({filteredApps.length})
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Connections */}
      {activeConnections > 0 && (
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Active Connections</span>
            <span className="badge badge--nominal">{activeConnections} Online</span>
          </div>
          <div className="divide-y divide-border-dim">
            {connections
              .filter((c) => c.status === "active")
              .map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between px-4 py-4 hover:bg-hover transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-nominal bg-nominal-bg flex items-center justify-center">
                      <span className="text-sm font-bold text-nominal">
                        {connection.provider.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary capitalize">
                          {connection.provider}
                        </span>
                        <span className="badge badge--nominal">Active</span>
                        {connection.pipedreamAuthId && <span className="badge badge--data">Pipedream</span>}
                      </div>
                      <div className="text-xs text-tertiary mt-0.5">
                        {connection.metadata?.account_name || connection.metadata?.workspace_name || "Connected workspace"}
                        {connection.metadata?.connected_at && (
                          <span className="ml-2">· <span className="font-mono tabular-nums">{formatDate(connection.metadata.connected_at)}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                  {connection.metadata?.region && (
                    <span className="badge badge--neutral">{connection.metadata.region}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Deployed Triggers */}
      {isPipedreamConfigured && deployedTriggers.length > 0 && (
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Event Sources</span>
            <span className="badge badge--data">{deployedTriggers.length} Deployed</span>
          </div>
          <div className="divide-y divide-border-dim">
            {deployedTriggers.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-center justify-between px-4 py-4 hover:bg-hover transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 border flex items-center justify-center ${
                    trigger.active 
                      ? "border-nominal bg-nominal-bg text-nominal" 
                      : "border-border-default bg-elevated text-tertiary"
                  }`}>
                    <span className="text-sm font-bold">
                      {trigger.provider.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{trigger.triggerId}</span>
                      <span className={`badge ${trigger.active ? "badge--nominal" : "badge--neutral"}`}>
                        {trigger.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="text-xs text-tertiary mt-0.5">
                      {trigger.provider} · Created <span className="font-mono tabular-nums">{formatDate(trigger.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTrigger(trigger.deploymentId)}
                  className="p-2 text-tertiary hover:text-critical transition-colors"
                  title="Delete trigger"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
