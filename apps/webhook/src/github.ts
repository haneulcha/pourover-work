import type { IssuePayload } from "./issue";

export type CreatedIssue = {
  readonly number: number;
  readonly htmlUrl: string;
};

export async function createGitHubIssue(opts: {
  readonly repo: string;
  readonly token: string;
  readonly payload: IssuePayload;
  readonly fetchImpl?: typeof fetch;
}): Promise<CreatedIssue> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(
    `https://api.github.com/repos/${opts.repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "pourover-webhook",
      },
      body: JSON.stringify({
        title: opts.payload.title,
        body: opts.payload.body,
        labels: opts.payload.labels,
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub API ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as { number: number; html_url: string };
  return { number: json.number, htmlUrl: json.html_url };
}
