import { useState } from "react";
import { signInWithGoogle, signOut, type Session } from "./api";
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
  const [pending, setPending] = useState(false);
  const handleClick = async () => {
    setPending(true);
    try {
      await signInWithGoogle(window.location.href);
      // 성공 시 signInWithGoogle 내부에서 navigate — 여기 도달 안 함.
    } catch (err) {
      console.error("sign-in failed:", err);
      setPending(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-pill bg-surface-strong px-4 py-2 text-body-sm text-text-primary shadow-hairline hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
    >
      {pending ? "이동 중…" : "Google 계정으로 로그인"}
    </button>
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
