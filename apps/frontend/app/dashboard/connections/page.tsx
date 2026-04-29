export default function ConnectionsPage() {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
        Connections shell
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Integration callbacks land here
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
        Shopify, Intercom, and Klaviyo callback routes still redirect to this
        page after backend handoff. The new integration UI can be rebuilt here.
      </p>
    </section>
  );
}
