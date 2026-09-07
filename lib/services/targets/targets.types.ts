import type { Kind, Spawnable } from "@/lib/kernel";

/** A target's kind is `organisation` or `person`, and **nothing else** — read
 *  off `internal/target/domain`, where `ParseKind` accepts exactly two names.
 *
 *  That is narrower than it first looks and it is the product's central claim in
 *  the type system. A target is the ROOT everything hangs off — §Scope's *"the
 *  thing being looked at; everything else hangs off it"* — and a hostname is
 *  never a root: it is something a tool said about one. `api.acme.example`
 *  arrives as an observation with lineage; `Acme Ltd` is what somebody decided
 *  to look at, and the whole attribution question is the distance between them.
 *
 *  So there is no `host` target, and a screen offering one would be inviting a
 *  person to skip the argument the product exists to make. */
export type TargetKind = "organisation" | "person";

export type Target = {
  target_id: string;
  name: string;
  kind: TargetKind;
  archived: boolean;
  created_at: string;
};

export type TargetInput = { name: string; kind: TargetKind };

/** One line of a target's scope, and there are TWO gates — `decisions/0010`.
 *
 *      spawn   what a tool may touch. Failing it is a REFUSAL
 *      claim   what the engagement covers. Failing it is NO SCOPE PROOF
 *
 *  Exclude beats include on both, which is why a rule is never edited: three
 *  surfaces cite one by id and each captured it at the time. */
export type Rule = {
  rule_id: string;
  pattern: string;
  polarity: "include" | "exclude";
  gate: "spawn" | "claim";
  /** Which kinds this line matches. A kind decides its own gate — nothing is
   *  ever spawned against a repository — so `kinds` and `gate` cannot disagree
   *  and the server rejects it when they do. */
  kinds: Kind[];
  /** Qualifies a SPAWN rule only: *a range in scope for passive collection is
   *  not thereby in scope for a loud scan*. **Absent on a claim rule**, because
   *  there are no processes on that gate — absent, never empty and never a
   *  wildcard. */
  tools?: ("passive" | "light" | "loud")[];
  created_at: string;
  /** Present means SUPERSEDED, and the row is still returned under `?all=1`.
   *  `0030` keeps a rule forever precisely so a citation made at the time still
   *  resolves; dropping it would BE the citation dangling. */
  superseded_at?: string;
};

export type RuleInput = {
  pattern: string;
  polarity: "include" | "exclude";
  gate: "spawn" | "claim";
  kinds: Kind[];
  tools?: ("passive" | "light" | "loud")[];
};

/** The kinds a SPAWN rule can name. Identical to `kernel.SPAWNABLE` and that is
 *  not a coincidence — both are "a process can be aimed at it". */
export type SpawnKind = Spawnable;
