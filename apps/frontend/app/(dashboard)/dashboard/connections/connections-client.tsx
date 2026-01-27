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

// Popular apps to highlight (these will be shown even if not in the API response)
const FEATURED_APPS = ["slack", "stripe", "hubspot", "zendesk", "github", "notion"];

// App icons mapping
const APP_ICONS: Record<string, JSX.Element> = {
  intercom: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  ),
  stripe: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

// Popular categories for filtering
const CATEGORIES = [
  { id: "all", label: "All Apps" },
  { id: "connected", label: "Connected" },
  { id: "crm", label: "CRM" },
  { id: "communication", label: "Communication" },
  { id: "developer-tools", label: "Developer Tools" },
  { id: "marketing", label: "Marketing" },
  { id: "productivity", label: "Productivity" },
  { id: "analytics", label: "Analytics" },
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

  // Show toast for success/error messages
  useEffect(() => {
    if (successMessage === "intercom") {
      setToastMessage("Successfully connected to Intercom!");
      setToastType("success");
      setShowToast(true);
    } else if (pipedreamSuccess && pipedreamApp) {
      setToastMessage(`Successfully connected to ${pipedreamApp}!`);
      setToastType("success");
      setShowToast(true);
      // Refresh the page to show new connection
      window.location.href = "/dashboard/connections";
    } else if (pipedreamError) {
      setToastMessage("Failed to connect - please try again");
      setToastType("error");
      setShowToast(true);
    } else if (errorMessage) {
      const errorMessages: Record<string, string> = {
        invalid_state: "Invalid state - please try again",
        state_expired: "Session expired - please try again",
        token_exchange_failed: "Failed to connect - please try again",
        configuration_error: "Configuration error - contact support",
        database_error: "Failed to save connection - please try again",
        access_denied: "Access denied - you cancelled the authorization",
      };
      setToastMessage(errorMessages[errorMessage] || `Error: ${errorMessage}`);
      setToastType("error");
      setShowToast(true);
    }
  }, [successMessage, errorMessage, pipedreamSuccess, pipedreamError, pipedreamApp]);

  // Auto-hide toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Fetch available Pipedream apps
  useEffect(() => {
    async function fetchApps() {
      try {
        const response = await fetch("/api/pipedream/apps?limit=200");
        if (response.ok) {
          const data = await response.json();
          setPipedreamApps(data.data || []);
        } else if (response.status === 500) {
          // Pipedream not configured
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

  // Fetch deployed triggers
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

  // Connect via Pipedream
  const handleConnectPipedream = useCallback(async (app: string) => {
    setConnectingApp(app);
    try {
      // Get a connect token
      const tokenResponse = await fetch("/api/pipedream/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get connect token");
      }

      const { connectLinkUrl } = await tokenResponse.json();
      
      // Redirect to Pipedream's OAuth flow
      window.location.href = connectLinkUrl;
    } catch (error) {
      console.error("Failed to initiate Pipedream connection:", error);
      setToastMessage("Failed to start connection flow");
      setToastType("error");
      setShowToast(true);
      setConnectingApp(null);
    }
  }, []);

  // Connect Intercom directly (existing OAuth flow)
  const handleConnectIntercom = () => {
    window.location.href = "/api/connections/intercom/authorize";
  };

  // Delete a deployed trigger
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

  // Get connection for a provider
  const getConnection = (provider: string) => {
    return connections.find(c => c.provider === provider && c.status === "active");
  };

  // Get icon for an app
  const getAppIcon = (app: string) => {
    return APP_ICONS[app] || APP_ICONS.default;
  };

  // Filter apps based on search and category
  const filteredApps = pipedreamApps.filter((app) => {
    // Exclude intercom - shown separately
    if (app.name_slug === "intercom") return false;

    // Normalize categories to string for searching
    const categoriesStr = Array.isArray(app.categories) 
      ? app.categories.join(" ").toLowerCase()
      : (typeof app.categories === "string" ? app.categories.toLowerCase() : "");

    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.name_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoriesStr.includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "connected" && getConnection(app.name_slug)) ||
      categoriesStr.includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Show limited apps or all based on state
  const displayedApps = showAllApps ? filteredApps : filteredApps.slice(0, 11);
  const hasMoreApps = filteredApps.length > 11;

  // Render an app card
  const renderAppCard = (app: PipedreamApp | { name_slug: string; name: string; description?: string }) => {
    const connection = getConnection(app.name_slug);
    const isConnected = !!connection;
    const isConnecting = connectingApp === app.name_slug;

    return (
      <div
        key={app.name_slug}
        className={`border rounded-lg p-4 transition-all ${
          isConnected
            ? "border-green-300 bg-green-50"
            : "border-gray-200 hover:border-blue-300 hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isConnected ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
            }`}
          >
            {getAppIcon(app.name_slug)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{app.name}</h3>
              {isConnected && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {Array.isArray((app as PipedreamApp).categories) 
                ? (app as PipedreamApp).categories?.slice(0, 2).join(", ")
                : (app as PipedreamApp).categories || app.description || "Integration"}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Connected to{" "}
              <span className="font-medium">
                {connection.metadata?.account_name ||
                  connection.metadata?.workspace_name ||
                  "Account"}
              </span>
            </p>
            {connection.metadata?.connected_at && (
              <p className="text-xs text-gray-500">
                Connected {formatDate(connection.metadata.connected_at)}
              </p>
            )}
            <button
              onClick={() => handleConnectPipedream(app.name_slug)}
              disabled={isConnecting}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Reconnect"}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {app.description || `Connect your ${app.name} account to capture events.`}
            </p>
            <button
              onClick={() => handleConnectPipedream(app.name_slug)}
              disabled={isConnecting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Connecting...
                </span>
              ) : (
                `Connect ${app.name}`
              )}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all ${
            toastType === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === "success" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toastMessage}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-gray-600 mt-1">Manage your integrations and data sources</p>
        </div>
      </div>

      {/* Available Integrations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Integrations</h2>
          {isPipedreamConfigured && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Powered by Pipedream
            </span>
          )}
        </div>

        {/* Search and Filter */}
        {isPipedreamConfigured && !loadingApps && (
          <div className="mb-6 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowAllApps(false);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                    selectedCategory === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {category.label}
                  {category.id === "connected" && connections.filter(c => c.status === "active").length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                      {connections.filter(c => c.status === "active").length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Results count */}
            {(searchQuery || selectedCategory !== "all") && (
              <p className="text-sm text-gray-500">
                {filteredApps.length} integration{filteredApps.length !== 1 ? "s" : ""} found
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            )}
          </div>
        )}

        {loadingApps ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Always show Intercom with direct OAuth option */}
            <div
              className={`border rounded-lg p-4 transition-all ${
                intercomConnection
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    intercomConnection ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {getAppIcon("intercom")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">Intercom</h3>
                    {intercomConnection && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Customer messaging</p>
                </div>
              </div>

              {intercomConnection ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Connected to{" "}
                    <span className="font-medium">
                      {intercomConnection.metadata?.workspace_name || "Workspace"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">{intercomConnection.metadata?.admin_email}</p>
                  <button
                    onClick={handleConnectIntercom}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                  >
                    Reconnect
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Capture conversations, events, and user data from Intercom.
                  </p>
                  <button
                    onClick={handleConnectIntercom}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    Connect Intercom
                  </button>
                </>
              )}
            </div>

            {/* Pipedream-powered integrations */}
            {isPipedreamConfigured && pipedreamApps.length > 0 ? (
              <>
                {/* Show filtered apps */}
                {displayedApps.map((app) => renderAppCard(app))}

                {/* Empty state for no results */}
                {filteredApps.length === 0 && (searchQuery || selectedCategory !== "all") && (
                  <div className="col-span-full text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No integrations found matching your criteria</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </>
            ) : !isPipedreamConfigured ? (
              // Show placeholder cards for featured apps when Pipedream isn't configured
              FEATURED_APPS.filter((slug) => slug !== "intercom").map((slug) => (
                <div key={slug} className="border border-gray-200 rounded-lg p-4 opacity-60">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                      {getAppIcon(slug)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">{slug}</h3>
                      <p className="text-xs text-gray-500">Integration</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure Pipedream to enable this integration.
                  </p>
                  <button
                    className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed text-sm"
                    disabled
                  >
                    Configure Pipedream
                  </button>
                </div>
              ))
            ) : null}
          </div>

          {/* Show More / Show Less button */}
          {isPipedreamConfigured && hasMoreApps && !searchQuery && selectedCategory === "all" && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllApps(!showAllApps)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAllApps ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Show less
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Show all {filteredApps.length} integrations
                  </>
                )}
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Connected Integrations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Integrations</h2>
        {connections.filter((c) => c.status === "active").length > 0 ? (
          <div className="space-y-3">
            {connections
              .filter((c) => c.status === "active")
              .map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                      {getAppIcon(connection.provider)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 capitalize">{connection.provider}</h3>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                        {connection.pipedreamAuthId && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Pipedream
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {connection.metadata?.account_name ||
                          connection.metadata?.workspace_name ||
                          "Connected workspace"}
                        {connection.metadata?.connected_at && (
                          <span className="ml-2">
                            · Connected {formatDate(connection.metadata.connected_at)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {connection.metadata?.region && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {connection.metadata.region}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No integrations connected yet.</p>
          </div>
        )}
      </div>

      {/* Deployed Triggers */}
      {isPipedreamConfigured && deployedTriggers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Event Sources</h2>
          <div className="space-y-3">
            {deployedTriggers.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      trigger.active ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {getAppIcon(trigger.provider)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{trigger.triggerId}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          trigger.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {trigger.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {trigger.provider} · Created {formatDate(trigger.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTrigger(trigger.deploymentId)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete trigger"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
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
