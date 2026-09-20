import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/space";

/** Post-login entry: send users to home or onboarding in one hop. */
export default async function EnterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await getMembership(session.user.id);
  redirect(membership ? "/home" : "/onboarding");
}
