import { redirect } from "next/navigation";

// Ingen forside i sig selv - send altid videre. middleware.ts afgør om det bliver
// /dashboard (logget ind) eller /login (ikke logget ind).
export default function Forside() {
  redirect("/dashboard");
}
