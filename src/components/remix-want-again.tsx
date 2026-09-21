import { remixWantAgainAction } from "@/lib/actions";
import { StatusSubmit } from "@/components/status-submit";

export function RemixWantAgainButton({ momentId }: { momentId: string }) {
  return (
    <form action={remixWantAgainAction}>
      <input type="hidden" name="momentId" value={momentId} />
      <StatusSubmit
        label="从这条想再来"
        pendingLabel="生成中…"
        className="btn btn-ghost"
      />
    </form>
  );
}
