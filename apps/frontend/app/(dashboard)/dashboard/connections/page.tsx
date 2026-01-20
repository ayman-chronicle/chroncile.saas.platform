export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-gray-600 mt-1">Manage your integrations and data sources</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Intercom</h3>
                <p className="text-xs text-gray-500">Customer messaging</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Capture conversations, events, and user data from Intercom.
            </p>
            <button
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              disabled
            >
              Connect (Coming Soon)
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Zendesk</h3>
                <p className="text-xs text-gray-500">Support tickets</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sync support tickets and customer interactions.
            </p>
            <button
              className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed text-sm"
              disabled
            >
              Coming Soon
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Stripe</h3>
                <p className="text-xs text-gray-500">Payment events</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Track payment events and subscription changes.
            </p>
            <button
              className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed text-sm"
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Integrations</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No integrations connected yet.</p>
        </div>
      </div>
    </div>
  );
}
