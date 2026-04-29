import { auth } from "@/server/auth/auth";

export default async function DashboardPage() {
  const session = await auth();
  const displayName = session?.user.name || session?.user.email || "there";

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
        Dashboard shell
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Welcome, {displayName}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
        The previous product dashboard has been removed. This route is ready for
        the rebuilt customer experience while keeping the auth boundary intact.
      </p>
    </section>
  );
}
