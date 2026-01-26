"use client";

import { useEffect, useState, useCallback } from "react";

interface EventEnvelope {
  event_id: string;
  tenant_id?: string;
  source: string;
  source_event_id?: string;
  event_type: string;
  occurred_at: string;
  ingested_at?: string;
  subject?: {
    conversation_id?: string;
    ticket_id?: string;
    customer_id?: string;
  };
  actor?: {
    actor_type?: string;
    actor_id?: string;
    name?: string;
  };
  payload?: Record<string, unknown>;
}

const getActorType = (event: EventEnvelope): string => {
  return event.actor?.actor_type || "system";
};

const getActorDisplay = (event: EventEnvelope): string => {
  return event.actor?.name || event.actor?.actor_id || "Unknown";
};

const getConversationId = (event: EventEnvelope): string => {
  return event.subject?.conversation_id || "N/A";
};

interface EventsClientProps {
  tenantId: string;
  eventsManagerUrl: string;
}

export function EventsClient({ tenantId: _tenantId, eventsManagerUrl }: EventsClientProps) {
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventEnvelope | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (filter !== "all") {
        params.set("source", filter);
      }
      
      const response = await fetch(`${eventsManagerUrl}/api/events?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : data.events || []);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [eventsManagerUrl, filter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("message") || eventType.includes("replied")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    }
    if (eventType.includes("conversation")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      );
    }
    if (eventType.includes("ticket")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    }
    if (eventType.includes("user")) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  };

  const getActorColor = (actorType: string) => {
    switch (actorType) {
      case "customer":
        return "bg-blue-100 text-blue-700";
      case "agent":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">View and replay your recorded events</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-3 text-gray-600">Loading events...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">View and replay your recorded events</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to connect to Events Manager</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500 mb-6">
              Make sure the Events Manager is running at {eventsManagerUrl}
            </p>
            <button
              onClick={fetchEvents}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">View and replay your recorded events</p>
          </div>
          <button
            onClick={fetchEvents}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h2>
            <p className="text-gray-600 mb-6">
              Events will appear here once Intercom starts sending webhooks. Make sure you&apos;ve configured the webhook URL in Intercom.
            </p>
            <a
              href="/dashboard/connections"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Check Connections
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">
            {events.length} event{events.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Sources</option>
            <option value="intercom">Intercom</option>
          </select>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.event_id}
                onClick={() => setSelectedEvent(event)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedEvent?.event_id === event.event_id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    getActorType(event) === "customer" ? "bg-blue-100 text-blue-600" :
                    getActorType(event) === "agent" ? "bg-green-100 text-green-600" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{event.event_type}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActorColor(getActorType(event))}`}>
                        {getActorType(event)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>{event.source}</span>
                      <span>•</span>
                      <span>{formatTime(event.occurred_at)}</span>
                    </div>
                    {event.actor?.name && (
                      <p className="text-sm text-gray-600 mt-1">{event.actor.name}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Event ID</label>
                <p className="text-sm font-mono text-gray-900 break-all">{selectedEvent.event_id}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                <p className="text-sm text-gray-900">{selectedEvent.event_type}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Source</label>
                <p className="text-sm text-gray-900">{selectedEvent.source}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Actor</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActorColor(getActorType(selectedEvent))}`}>
                    {getActorType(selectedEvent)}
                  </span>
                  <span className="text-sm text-gray-900">{getActorDisplay(selectedEvent)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Conversation ID</label>
                <p className="text-sm font-mono text-gray-900 break-all">{getConversationId(selectedEvent)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Occurred At</label>
                <p className="text-sm text-gray-900">{new Date(selectedEvent.occurred_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Payload</label>
                <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64 text-gray-700">
                  {JSON.stringify(selectedEvent.payload || {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Select an event to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
