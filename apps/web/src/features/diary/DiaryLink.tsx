import { useSession } from "@/features/auth/useSession";

export function DiaryLink({ onOpen }: { readonly onOpen: () => void }) {
  const { status, session } = useSession();
  if (status !== "loaded" || session == null) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-pill bg-surface-strong px-4 py-2 text-body-sm text-text-secondary shadow-hairline hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      내 기록
    </button>
  );
}
