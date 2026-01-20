export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Agent Warmup</h1>
        </div>
        <div className="space-y-6">
          <blockquote className="text-white/90 text-xl font-light leading-relaxed">
            &ldquo;Record, replay, and perfect your customer interactions. Get your AI agents ready for production with real-world scenarios.&rdquo;
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Lightning Fast Setup</p>
              <p className="text-white/70 text-sm">Connect your integrations in minutes</p>
            </div>
          </div>
        </div>
        <p className="text-white/60 text-sm">
          © 2026 Agent Warmup. All rights reserved.
        </p>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
