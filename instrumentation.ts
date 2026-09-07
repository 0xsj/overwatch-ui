/** Next's startup hook — once per server process, before the first request.
 *
 *  It exists because `usingFixtures` answers "is a base URL configured", and the
 *  question somebody actually has at boot is "am I talking to the server". Those
 *  are different, and the gap between them is a dev server started without the
 *  root `.env` exported: the client runs happily on fixtures and only says so on
 *  a badge four screens in. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkBackend, describeHealth } = await import("./lib/root/health");
  console.log(describeHealth(await checkBackend()));
}
