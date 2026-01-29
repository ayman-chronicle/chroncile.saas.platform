import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-tertiary tracking-wide uppercase mb-1">
            Operational Overview
          </div>
          <h1 className="text-2xl font-semibold text-primary">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Operator"}
          </h1>
        </div>
        <div className="text-sm text-tertiary">
          {currentDate}
        </div>
      </div>

      {/* System Status Banner */}
      <div className="panel">
        <div className="flex items-center justify-between px-4 py-3 bg-nominal-bg border-b border-nominal-dim">
          <div className="flex items-center gap-3">
            <div className="status-dot status-dot--nominal status-dot--pulse" />
            <span className="text-sm font-medium text-nominal">
              All Systems Operational
            </span>
          </div>
          <span className="font-mono text-xs text-nominal tabular-nums">
            Last check: {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Events Today */}
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Events Today</span>
            <div className="status-dot status-dot--nominal status-dot--pulse" />
          </div>
          <div className="panel__content">
            <div className="metric">
              <div className="metric__value metric__value--data">0</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="metric__delta metric__delta--neutral">+0%</span>
                <span className="text-xs text-tertiary">vs yesterday</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Connections */}
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Connections</span>
            <div className="status-dot status-dot--data" />
          </div>
          <div className="panel__content">
            <div className="metric">
              <div className="metric__value">0</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge badge--neutral">Inactive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Sessions */}
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">Sessions</span>
            <div className="status-dot status-dot--offline" />
          </div>
          <div className="panel__content">
            <div className="metric">
              <div className="metric__value text-tertiary">0</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="badge badge--neutral">Standby</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="panel">
          <div className="panel__header">
            <span className="panel__title">System Health</span>
            <div className="status-dot status-dot--nominal status-dot--pulse" />
          </div>
          <div className="panel__content">
            <div className="metric">
              <div className="metric__value metric__value--nominal">99.9%</div>
              <div className="mt-2">
                <div className="progress-bar">
                  <div className="progress-bar__fill progress-bar__fill--nominal" style={{ width: '99.9%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Checklist - 2 columns */}
        <div className="lg:col-span-2 panel">
          <div className="panel__header">
            <span className="panel__title">Getting Started</span>
            <span className="badge badge--caution">0/3 Complete</span>
          </div>
          <div className="divide-y divide-border-dim">
            {/* Step 1 - Active */}
            <Link 
              href="/dashboard/connections"
              className="flex items-center gap-4 px-4 py-4 hover:bg-hover transition-colors group"
            >
              <div className="w-10 h-10 border border-data bg-data-bg flex items-center justify-center font-mono text-sm font-bold text-data">
                01
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary group-hover:text-data transition-colors">
                    Connect your first integration
                  </span>
                  <svg className="w-4 h-4 text-tertiary group-hover:text-data group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <p className="text-sm text-tertiary mt-0.5">
                  Establish a data source connection to begin capturing events
                </p>
              </div>
              <span className="badge badge--data">Action Required</span>
            </Link>

            {/* Step 2 - Pending */}
            <div className="flex items-center gap-4 px-4 py-4 opacity-50">
              <div className="w-10 h-10 border border-border-default bg-elevated flex items-center justify-center font-mono text-sm font-bold text-tertiary">
                02
              </div>
              <div className="flex-1">
                <span className="font-medium text-secondary">Start a recording session</span>
                <p className="text-sm text-tertiary mt-0.5">
                  Initialize event capture for training data collection
                </p>
              </div>
              <span className="badge badge--neutral">Pending</span>
            </div>

            {/* Step 3 - Pending */}
            <div className="flex items-center gap-4 px-4 py-4 opacity-50">
              <div className="w-10 h-10 border border-border-default bg-elevated flex items-center justify-center font-mono text-sm font-bold text-tertiary">
                03
              </div>
              <div className="flex-1">
                <span className="font-medium text-secondary">Replay and validate</span>
                <p className="text-sm text-tertiary mt-0.5">
                  Execute recorded sessions against your agent for validation
                </p>
              </div>
              <span className="badge badge--neutral">Pending</span>
            </div>
          </div>
        </div>

        {/* Quick Actions - 1 column */}
        <div className="space-y-4">
          {/* Documentation */}
          <div className="panel">
            <div className="panel__header">
              <span className="panel__title">Documentation</span>
            </div>
            <div className="panel__content">
              <p className="text-sm text-tertiary mb-4">
                System operation manuals and API reference guides.
              </p>
              <a 
                href="#" 
                className="btn btn--secondary w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                View Docs
              </a>
            </div>
          </div>

          {/* Support */}
          <div className="panel">
            <div className="panel__header">
              <span className="panel__title">Support</span>
            </div>
            <div className="panel__content">
              <p className="text-sm text-tertiary mb-4">
                Technical assistance and incident reporting.
              </p>
              <a 
                href="#" 
                className="btn btn--secondary w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Recent Activity</span>
          <span className="text-xs text-tertiary">Last 24 hours</span>
        </div>
        <div className="panel__content">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="w-12 h-12 text-border-default mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
            <div className="text-sm text-tertiary mb-1">No activity recorded</div>
            <div className="text-xs text-disabled">
              Connect an integration to begin capturing events
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
