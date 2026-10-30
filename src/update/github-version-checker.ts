import type { Nh3dVersionCheckResult, Nh3dVersionTag } from "./types";

const githubRepoOwner = "kafuji";
const githubRepoName = "nethack-3d-plus";
const githubRepoUrl = `https://github.com/${githubRepoOwner}/${githubRepoName}`;
const githubReleasesApiUrl = `https://api.github.com/repos/${githubRepoOwner}/${githubRepoName}/releases?per_page=100`;
const versionCheckTimeoutMs = 20000;

type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

type ParsedVersionTag = Nh3dVersionTag & {
  parsedVersion: ParsedSemver;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function resolveCurrentVersion(): string {
  const envValue =
    typeof import.meta.env.VITE_NH3D_APP_VERSION === "string"
      ? import.meta.env.VITE_NH3D_APP_VERSION.trim()
      : "";
  return envValue || "0.0.0";
}

function parseSemver(value: string): ParsedSemver | null {
  const match =
    /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9a-zA-Z.-]+))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]
      ? match[4]
          .split(".")
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
      : [],
  };
}

function comparePrereleaseIdentifiers(left: string, right: string): number {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);
  if (leftIsNumeric && rightIsNumeric) {
    return Number(left) - Number(right);
  }
  if (leftIsNumeric) {
    return -1;
  }
  if (rightIsNumeric) {
    return 1;
  }
  return left.localeCompare(right);
}

function compareSemver(left: ParsedSemver, right: ParsedSemver): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  if (left.patch !== right.patch) {
    return left.patch - right.patch;
  }

  const leftHasPrerelease = left.prerelease.length > 0;
  const rightHasPrerelease = right.prerelease.length > 0;
  if (!leftHasPrerelease && !rightHasPrerelease) {
    return 0;
  }
  if (!leftHasPrerelease) {
    return 1;
  }
  if (!rightHasPrerelease) {
    return -1;
  }

  const maxLength = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];
    if (leftIdentifier === undefined) {
      return -1;
    }
    if (rightIdentifier === undefined) {
      return 1;
    }
    const comparison = comparePrereleaseIdentifiers(
      leftIdentifier,
      rightIdentifier,
    );
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function parseVersionTag(value: unknown): ParsedVersionTag | null {
  const name = normalizeString(
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { name?: unknown }).name
      : value,
  );
  if (!name) {
    return null;
  }

  const parsedVersion = parseSemver(name);
  if (!parsedVersion) {
    return null;
  }

  return {
    name,
    version: `v${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}${
      parsedVersion.prerelease.length > 0
        ? `-${parsedVersion.prerelease.join(".")}`
        : ""
    }`,
    parsedVersion,
  };
}

function parseGitHubRelease(value: unknown): ParsedVersionTag | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const release = value as {
    body?: unknown;
    draft?: unknown;
    html_url?: unknown;
    tag_name?: unknown;
  };
  if (release.draft === true) {
    return null;
  }

  const parsedTag = parseVersionTag({ name: release.tag_name });
  if (!parsedTag) {
    return null;
  }

  return {
    ...parsedTag,
    releaseNotesMarkdown: normalizeNullableString(release.body),
    releasePageUrl: normalizeNullableString(release.html_url),
  };
}

async function fetchGitHubReleases(): Promise<unknown> {
  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => {
    controller.abort();
  }, versionCheckTimeoutMs);

  try {
    const response = await fetch(githubReleasesApiUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `GitHub release request failed (${response.status} ${response.statusText}).`,
      );
    }
    return response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("GitHub release request timed out.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutHandle);
  }
}

export function getNh3dGitHubReleasesPageUrl(): string {
  return `${githubRepoUrl}/releases`;
}

export async function checkForNh3dGitHubVersionUpdates(): Promise<Nh3dVersionCheckResult> {
  const currentVersion = resolveCurrentVersion();
  const currentParsedVersion = parseSemver(currentVersion);
  const releasesPageUrl = getNh3dGitHubReleasesPageUrl();

  if (!currentParsedVersion) {
    return {
      currentVersion,
      latestTagName: null,
      latestVersion: null,
      hasUpdate: false,
      newerTags: [],
      releasesPageUrl,
      error: "Current app version is not a valid semantic version.",
    };
  }

  try {
    const payload = await fetchGitHubReleases();
    if (!Array.isArray(payload)) {
      throw new Error("GitHub releases response was invalid.");
    }

    const uniqueTags = new Map<string, ParsedVersionTag>();
    for (const entry of payload) {
      const parsedTag = parseGitHubRelease(entry);
      if (!parsedTag || uniqueTags.has(parsedTag.name)) {
        continue;
      }
      uniqueTags.set(parsedTag.name, parsedTag);
    }

    const sortedTags = Array.from(uniqueTags.values()).sort((left, right) => {
      const versionComparison = compareSemver(
        right.parsedVersion,
        left.parsedVersion,
      );
      if (versionComparison !== 0) {
        return versionComparison;
      }
      return right.name.localeCompare(left.name);
    });
    const latestTag = sortedTags[0] ?? null;
    const newerTags = sortedTags
      .filter(
        (tag) => compareSemver(tag.parsedVersion, currentParsedVersion) > 0,
      )
      .map<Nh3dVersionTag>((tag) => ({
        name: tag.name,
        version: tag.version,
        releaseNotesMarkdown: tag.releaseNotesMarkdown ?? null,
        releasePageUrl: tag.releasePageUrl ?? null,
      }));

    return {
      currentVersion,
      latestTagName: latestTag?.name ?? null,
      latestVersion: latestTag?.version ?? null,
      hasUpdate: newerTags.length > 0,
      newerTags,
      releasesPageUrl,
      error: null,
    };
  } catch (error) {
    return {
      currentVersion,
      latestTagName: null,
      latestVersion: null,
      hasUpdate: false,
      newerTags: [],
      releasesPageUrl,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check GitHub releases.",
    };
  }
}
