import { googleSignInUrl, signOut, type Session } from "./api";
import { useSession } from "./useSession";

export function LoginPill() {
  const { status, session } = useSession();

  if (status === "loading") {
    return (
      <div className="text-body-sm text-text-secondary" aria-live="polite">
        세션 확인 중…
      </div>
    );
  }

  if (session == null) {
    return <SignInButton />;
  }

  return <SignedIn session={session} />;
}

function SignInButton() {
  const callbackUrl = window.location.href;
  return (
    <a
      href={googleSignInUrl(callbackUrl)}
      className="inline-flex items-center gap-2 rounded-full bg-surface-strong px-4 py-2 text-body-sm text-text-primary shadow-sm hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      Google 계정으로 로그인
    </a>
  );
}

function SignedIn({ session }: { readonly session: NonNullable<Session> }) {
  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="inline-flex items-center gap-3">
      <span className="text-body-sm text-text-secondary">
        {session.user.name}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="text-body-sm text-text-secondary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        로그아웃
      </button>
    </div>
  );
}
