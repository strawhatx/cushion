import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.mark}>CUSHION</div>
        <h1>Sign in to check your schedule</h1>
        <p>
          Cushion reads your Google Calendar (read-only) to warn you when two meetings
          don&apos;t leave enough real travel time between them.
        </p>
        <form action={signInWithGoogle}>
          <button className={styles.googleButton} type="submit">
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
        <p className={styles.fineprint}>
          We only ever request read-only calendar access. Cushion never edits or creates events.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
