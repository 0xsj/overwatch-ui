"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import type { MeSession } from "@/lib/services/identity";
import { revokeSessionAction } from "../_actions";
import s from "../account.module.css";

/** `user_agent` and `address` are shown RAW, and that is a request from the
 *  backend rather than an omission here.
 *
 *  The server does not parse them into a friendly device name and asks that we
 *  do not either: a tidied "Chrome on macOS" is a claim neither repo can stand
 *  behind, and the whole purpose of this list is that somebody recognises a
 *  session they do NOT recognise. A wrong friendly name is worse than an ugly
 *  true one, because it is reassuring. */
export function Sessions({ sessions }: { sessions: MeSession[] }) {
  const [ended, setEnded] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const end = (id: string) =>
    start(async () => {
      const result = await revokeSessionAction(id);
      // A session that is not yours answers 404, the same as one that does not
      // exist. There is nothing to tell apart, so success and "already gone"
      // land in the same place.
      if (result.status !== "error") setEnded((e) => new Set(e).add(id));
    });

  const live = sessions.filter((x) => !ended.has(x.session_id));

  return (
    <div className={s.rows}>
      {live.map((x) => (
        <div key={x.session_id} className={s.session}>
          <div className={s.who}>
            <span className={s.agent}>{x.user_agent || "no user agent sent"}</span>
            <span className={s.mono}>
              {x.address} · started {x.issued_at.slice(0, 16).replace("T", " ")}
            </span>
          </div>
          {x.current ? (
            <Badge tone="accent" glyph="✓">this one</Badge>
          ) : (
            <Button size="sm" onClick={() => end(x.session_id)} disabled={pending}>
              End it
            </Button>
          )}
        </div>
      ))}
      {live.length === 1 ? (
        <Text size="xs" tone="quiet">
          Only this session. Nothing else is signed in as you.
        </Text>
      ) : null}
    </div>
  );
}
