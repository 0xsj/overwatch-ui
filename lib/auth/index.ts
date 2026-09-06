import { fakeAuth } from "./fake";
import type { AuthPort } from "./port";

export const auth: AuthPort = fakeAuth;

export type { AuthPort, Failure, Field, Invite, Result, SignUpInput, Success } from "./port";
