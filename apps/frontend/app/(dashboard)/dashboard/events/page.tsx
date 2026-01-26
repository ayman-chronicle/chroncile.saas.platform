import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  return (
    <EventsClient 
      tenantId={session.user.tenantId}
      eventsManagerUrl={process.env.EVENTS_MANAGER_URL || "http://localhost:8080"}
    />
  );
}
