import type { User } from "@supabase/supabase-js";

type MetadataRecord = Record<string, unknown>;

export interface PasswordStrengthResult {
  hint: string;
  label: string;
  score: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toMetadataRecord = (value: unknown): MetadataRecord =>
  value && typeof value === "object" ? (value as MetadataRecord) : {};

const readMetadataString = (metadata: MetadataRecord, keys: string[]) => {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim());

export const getFallbackDisplayName = (email: string | null | undefined) => {
  if (!email) return "Story Crafter";

  const localPart = email.split("@")[0] || "";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();

  if (!normalized) return "Story Crafter";

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const getUserDisplayName = (
  user:
    | Pick<User, "email" | "user_metadata">
    | { email?: string | null; user_metadata?: unknown }
    | null
    | undefined,
) => {
  if (!user) return null;

  const metadata = toMetadataRecord(user.user_metadata);
  return (
    readMetadataString(metadata, ["display_name", "full_name", "name"]) ||
    getFallbackDisplayName(user.email)
  );
};

export const getUserAvatarUrl = (
  user:
    | Pick<User, "user_metadata">
    | { user_metadata?: unknown }
    | null
    | undefined,
) => {
  if (!user) return null;

  const metadata = toMetadataRecord(user.user_metadata);
  return readMetadataString(metadata, ["avatar_url", "picture"]);
};

export const getUserBio = (
  user:
    | Pick<User, "user_metadata">
    | { user_metadata?: unknown }
    | null
    | undefined,
) => {
  if (!user) return null;

  const metadata = toMetadataRecord(user.user_metadata);
  return readMetadataString(metadata, ["bio", "about"]);
};

export const getUserInitials = (
  name: string | null | undefined,
  email: string | null | undefined,
) => {
  const source = (name || getFallbackDisplayName(email)).trim();

  if (!source) {
    return "WZ";
  }

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

export const getPasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return {
      hint: "Use at least 6 characters.",
      label: "Add a password",
      score: 0,
    };
  }

  let score = 0;

  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return {
      hint: "Add more characters and mix letters, numbers, or symbols.",
      label: "Weak",
      score: 1,
    };
  }

  if (score === 2) {
    return {
      hint: "Good start. Add a number or symbol for extra protection.",
      label: "Fair",
      score: 2,
    };
  }

  if (score === 3 || score === 4) {
    return {
      hint: "Solid coverage. A symbol or longer phrase makes it stronger.",
      label: "Good",
      score: 3,
    };
  }

  return {
    hint: "Strong password. You are in great shape.",
    label: "Strong",
    score: 4,
  };
};

export const formatAbsoluteDateTime = (value: string | null | undefined) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatRelativeTime = (value: string | null | undefined) => {
  if (!value) return "Not yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
};
