"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/modal";

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

interface HealthCheckResult {
  healthy: boolean;
  status: "connected" | "error" | "expired" | "unknown";
  message: string;
  details?: {
    workspace_name?: string;
    admin_email?: string;
    region?: string;
    last_checked?: string;
  };
  error?: string;
}

type ConnectionHealth = {
  [connectionId: string]: {
    status: "idle" | "testing" | "healthy" | "error" | "expired";
    message?: string;
    lastChecked?: string;
  };
};

interface ConnectionsClientProps {
  connections: ConnectionData[];
  successMessage?: string;
  errorMessage?: string;
  pipedreamSuccess?: boolean;
  pipedreamError?: boolean;
  pipedreamApp?: string;
}

const FEATURED_APPS = ["intercom", "slack", "stripe", "hubspot", "zendesk", "github", "notion"];

const APP_ICONS: Record<string, React.ReactNode> = {
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
  connections: initialConnections,
  successMessage,
  errorMessage,
  pipedreamSuccess,
  pipedreamError,
  pipedreamApp,
}: ConnectionsClientProps) {
  const router = useRouter();
  const [connections, setConnections] = useState(initialConnections);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  
  const [pipedreamApps, setPipedreamApps] = useState<PipedreamApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [searchingApps, setSearchingApps] = useState(false);
  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [deployedTriggers, setDeployedTriggers] = useState<DeployedTrigger[]>([]);
  const [isPipedreamConfigured, setIsPipedreamConfigured] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllApps, setShowAllApps] = useState(false);
  
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [connectionToDisconnect, setConnectionToDisconnect] = useState<ConnectionData | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({});

  const showToastMessage = useCallback((message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  useEffect(() => {
    if (successMessage === "disconnected") {
      showToastMessage("Connection disconnected successfully", "success");
    } else if (pipedreamSuccess) {
      async function syncConnections() {
        try {
          const response = await fetch("/api/pipedream/accounts/sync", {
            method: "POST",
          });

          if (response.ok) {
            const data = await response.json();
            const appName = pipedreamApp || "the integration";
            showToastMessage(
              `Successfully connected to ${appName}! ${data.synced > 0 ? `Synced ${data.synced} connection(s).` : ""}`,
              "success"
            );
            router.refresh();
            setTimeout(() => {
              window.location.href = "/dashboard/connections";
            }, 500);
          } else {
            throw new Error("Failed to sync connections");
          }
        } catch (error) {
          console.error("Failed to sync Pipedream connections:", error);
          showToastMessage(
            pipedreamApp 
              ? `Connected to ${pipedreamApp}, but failed to sync. Please refresh the page.`
              : "Connection successful, but failed to sync. Please refresh the page.",
            "error"
          );
          setTimeout(() => {
            window.location.href = "/dashboard/connections";
          }, 1000);
        }
      }
      
      syncConnections();
    } else if (pipedreamError) {
      showToastMessage("Failed to connect - please try again", "error");
    } else if (errorMessage) {
      const errorMessages: Record<string, string> = {
        invalid_state: "Security check failed. Please try connecting again.",
        state_expired: "Your session expired. Please try connecting again.",
        token_exchange_failed: "Failed to connect. Please try again.",
        configuration_error: "There's a configuration issue. Please contact support.",
        database_error: "Failed to save the connection. Please try again.",
        access_denied: "You cancelled the authorization. Connect when you're ready.",
        workspace_info_failed: "Couldn't retrieve workspace information. Please try again.",
        missing_params: "The authorization response was incomplete. Please try again.",
        invalid_state_format: "Invalid authorization data. Please try again.",
        no_token: "No access token received. Please try again.",
        token_exchange_error: "Network error during authorization. Please check your connection.",
        workspace_info_error: "Network error getting workspace info. Please try again.",
        encryption_not_configured: "Server configuration error. Please contact support.",
        disconnect_failed: "Failed to disconnect. Please try again.",
        intercom_oauth_deprecated: "Direct Intercom OAuth has been deprecated. Please use the Pipedream integration below.",
      };
      showToastMessage(errorMessages[errorMessage] || `Error: ${errorMessage}`, "error");
    }
  }, [successMessage, errorMessage, pipedreamSuccess, pipedreamError, pipedreamApp, showToastMessage]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const fetchApps = useCallback(async (query?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (query) {
        params.set("q", query);
      }
      
      const response = await fetch(`/api/pipedream/apps?${params}`);
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      } else if (response.status === 500) {
        setIsPipedreamConfigured(false);
        return [];
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch Pipedream apps:", error);
      setIsPipedreamConfigured(false);
      return [];
    }
  }, []);

  useEffect(() => {
    async function loadInitialApps() {
      setLoadingApps(true);
      try {
        const featuredPromises = FEATURED_APPS.map(appSlug => 
          fetchApps(appSlug).then(apps => apps.filter((app: PipedreamApp) => app.name_slug === appSlug))
        );
        
        const popularPromise = fetchApps();
        
        const [featuredResults, popularApps] = await Promise.all([
          Promise.all(featuredPromises),
          popularPromise,
        ]);
        
        const featuredApps = featuredResults.flat();
        const featuredSlugs = new Set(featuredApps.map((app: PipedreamApp) => app.name_slug));
        const uniquePopularApps = popularApps.filter((app: PipedreamApp) => !featuredSlugs.has(app.name_slug));
        
        setPipedreamApps([...featuredApps, ...uniquePopularApps]);
      } catch (error) {
        console.error("Failed to load initial apps:", error);
      } finally {
        setLoadingApps(false);
      }
    }
    loadInitialApps();
  }, [fetchApps]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!searchQuery.trim()) {
      async function resetApps() {
        setSearchingApps(true);
        try {
          const featuredPromises = FEATURED_APPS.map(appSlug => 
            fetchApps(appSlug).then(apps => apps.filter((app: PipedreamApp) => app.name_slug === appSlug))
          );
          const popularPromise = fetchApps();
          
          const [featuredResults, popularApps] = await Promise.all([
            Promise.all(featuredPromises),
            popularPromise,
          ]);
          
          const featuredApps = featuredResults.flat();
          const featuredSlugs = new Set(featuredApps.map((app: PipedreamApp) => app.name_slug));
          const uniquePopularApps = popularApps.filter((app: PipedreamApp) => !featuredSlugs.has(app.name_slug));
          
          setPipedreamApps([...featuredApps, ...uniquePopularApps]);
        } finally {
          setSearchingApps(false);
        }
      }
      if (!loadingApps) {
        resetApps();
      }
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchingApps(true);
      try {
        const results = await fetchApps(searchQuery.trim());
        setPipedreamApps(results);
      } finally {
        setSearchingApps(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, fetchApps, loadingApps]);

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

      const responseData = await tokenResponse.json();
      const { connectLinkUrl } = responseData;
      
      let finalConnectUrl = connectLinkUrl;
      if (app && !connectLinkUrl.includes(`app=${app}`) && !connectLinkUrl.includes(`app_id=${app}`)) {
        const url = new URL(connectLinkUrl);
        url.searchParams.set('app', app);
        finalConnectUrl = url.toString();
      }
      
      window.location.href = finalConnectUrl;
    } catch (error) {
      console.error("Failed to initiate Pipedream connection:", error);
      showToastMessage("Failed to start connection flow", "error");
      setConnectingApp(null);
    }
  }, [showToastMessage]);

  const handleDeleteTrigger = async (deploymentId: string) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;

    try {
      const response = await fetch(`/api/pipedream/triggers/deployed/${deploymentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeployedTriggers(prev => prev.filter(t => t.deploymentId !== deploymentId));
        showToastMessage("Trigger deleted successfully", "success");
      } else {
        throw new Error("Failed to delete trigger");
      }
    } catch (error) {
      console.error("Failed to delete trigger:", error);
      showToastMessage("Failed to delete trigger", "error");
    }
  };

  const handleDisconnectClick = (connection: ConnectionData) => {
    setConnectionToDisconnect(connection);
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!connectionToDisconnect) return;

    setIsDisconnecting(true);

    try {
      const response = await fetch(`/api/connections/${connectionToDisconnect.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      setConnections((prev) => prev.filter((c) => c.id !== connectionToDisconnect.id));

      showToastMessage("Connection disconnected successfully", "success");
      setShowDisconnectModal(false);
      setConnectionToDisconnect(null);
      
      router.refresh();
    } catch (error) {
      console.error("Disconnect error:", error);
      showToastMessage(
        error instanceof Error ? error.message : "Failed to disconnect",
        "error"
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTestConnection = async (connection: ConnectionData) => {
    setConnectionHealth((prev) => ({
      ...prev,
      [connection.id]: { status: "testing" },
    }));

    try {
      const response = await fetch(`/api/connections/${connection.id}/test`, {
        method: "POST",
      });

      const data: HealthCheckResult = await response.json();

      setConnectionHealth((prev) => ({
        ...prev,
        [connection.id]: {
          status: data.healthy ? "healthy" : data.status === "expired" ? "expired" : "error",
          message: data.message,
          lastChecked: data.details?.last_checked,
        },
      }));

      if (data.healthy) {
        showToastMessage("Connection is healthy!", "success");
      } else {
        showToastMessage(data.error || data.message, "error");
      }
    } catch (error) {
      console.error("Health check error:", error);
      setConnectionHealth((prev) => ({
        ...prev,
        [connection.id]: {
          status: "error",
          message: "Failed to test connection",
        },
      }));
      showToastMessage("Failed to test connection", "error");
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

  const getAppIcon = (app: string) => {
    return APP_ICONS[app] || APP_ICONS.default;
  };

  const filteredApps = pipedreamApps
    .filter((app) => {
      if (selectedCategory === "all") return true;
      if (selectedCategory === "connected") return !!getConnection(app.name_slug);
      
      const categoriesStr = Array.isArray(app.categories) 
        ? app.categories.join(" ").toLowerCase()
        : (typeof app.categories === "string" ? app.categories.toLowerCase() : "");
      
      return categoriesStr.includes(selectedCategory.toLowerCase());
    })
    .sort((a, b) => {
      if (!searchQuery) {
        const aIsFeatured = FEATURED_APPS.includes(a.name_slug);
        const bIsFeatured = FEATURED_APPS.includes(b.name_slug);
        
        if (aIsFeatured && !bIsFeatured) return -1;
        if (!aIsFeatured && bIsFeatured) return 1;
        
        if (aIsFeatured && bIsFeatured) {
          return FEATURED_APPS.indexOf(a.name_slug) - FEATURED_APPS.indexOf(b.name_slug);
        }
      }
      
      return a.name.localeCompare(b.name);
    });

  const displayedApps = showAllApps ? filteredApps : filteredApps.slice(0, 12);
  const hasMoreApps = filteredApps.length > 12;

  const getHealthIndicator = (connectionId: string) => {
    const health = connectionHealth[connectionId];
    if (!health || health.status === "idle") {
      return null;
    }

    if (health.status === "testing") {
      return (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Testing...
        </span>
      );
    }

    if (health.status === "healthy") {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Healthy
        </span>
      );
    }

    if (health.status === "expired") {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600">
          <span className="w-2 h-2 bg-yellow-500 rounded-full" />
          Token Expired
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-xs text-red-600">
        <span className="w-2 h-2 bg-red-500 rounded-full" />
        Error
      </span>
    );
  };

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
                ? ((app as PipedreamApp).categories as string[]).slice(0, 2).join(", ")
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
            {connection.id && getHealthIndicator(connection.id)}
            <div className="flex gap-2">
              <button
                onClick={() => handleTestConnection(connection)}
                disabled={connectionHealth[connection.id]?.status === "testing"}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionHealth[connection.id]?.status === "testing" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Testing...
                  </span>
                ) : (
                  "Test"
                )}
              </button>
              <button
                onClick={() => handleConnectPipedream(app.name_slug)}
                disabled={isConnecting}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              >
                Reconnect
              </button>
            </div>
            <button
              onClick={() => handleDisconnectClick(connection)}
              className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm border border-red-200"
            >
              Disconnect
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
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all max-w-md ${
            toastType === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === "success" ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-2 hover:opacity-80"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {toastType === "error" && errorMessage && (
            <div className="mt-2 flex gap-2 text-sm">
              <a href="mailto:support@example.com" className="underline hover:no-underline">
                Contact support
              </a>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => {
          setShowDisconnectModal(false);
          setConnectionToDisconnect(null);
        }}
        onConfirm={handleConfirmDisconnect}
        title="Disconnect Integration"
        message={`Are you sure you want to disconnect ${connectionToDisconnect?.provider === "intercom" ? "Intercom" : connectionToDisconnect?.provider}? This will stop receiving new events from this integration. Your existing event data will be preserved.`}
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDisconnecting}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-gray-600 mt-1">Manage your integrations and data sources</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Integrations</h2>
          {isPipedreamConfigured && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Powered by Pipedream
            </span>
          )}
        </div>

        {isPipedreamConfigured && !loadingApps && (
          <div className="mb-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {searchingApps ? (
                  <svg className="h-5 w-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                placeholder="Search integrations... (e.g., Intercom, Slack, Stripe)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAllApps(false);
                }}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

            {(searchQuery || selectedCategory !== "all") && (
              <p className="text-sm text-gray-500">
                {searchingApps ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching...
                  </span>
                ) : (
                  <>
                    {filteredApps.length} integration{filteredApps.length !== 1 ? "s" : ""} found
                    {searchQuery && ` for "${searchQuery}"`}
                  </>
                )}
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
            {isPipedreamConfigured && pipedreamApps.length > 0 ? (
              <>
                {displayedApps.map((app) => renderAppCard(app))}

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
              FEATURED_APPS.map((slug) => (
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
                        {getHealthIndicator(connection.id)}
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
                  <div className="flex items-center gap-2">
                    {connection.metadata?.region && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                        {connection.metadata.region}
                      </span>
                    )}
                    <button
                      onClick={() => handleTestConnection(connection)}
                      disabled={connectionHealth[connection.id]?.status === "testing"}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Test connection"
                    >
                      {connectionHealth[connection.id]?.status === "testing" ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnectClick(connection)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Disconnect"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p>No integrations connected yet.</p>
            <p className="text-sm mt-1">Connect an integration above to start capturing events.</p>
          </div>
        )}
      </div>

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
