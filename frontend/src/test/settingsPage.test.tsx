import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/pages/SettingsPage";

const {
  deleteProfileAvatarMock,
  syncTargetsNowMock,
  uploadProfileAvatarMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  deleteProfileAvatarMock: vi.fn(async () => {}),
  syncTargetsNowMock: vi.fn(async () => {}),
  uploadProfileAvatarMock: vi.fn(async () => ({
    avatarStoragePath: "avatars/firebase-user-001/profile",
    avatarUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/avatar-next",
  })),
  updateProfileMock: vi.fn(async () => {}),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "firebase-user-001",
      providers: ["password"],
      createdAt: "2026-04-07T00:00:00.000Z",
      lastSignInAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
    },
    avatarUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/avatar",
    bio: "Writing stories one quiet draft at a time.",
    changePassword: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => {}),
    displayName: "Iris Vale",
    email: "iris@example.com",
    isEmailVerified: true,
    pendingAuthAction: null,
    resendVerificationEmail: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    updateProfile: updateProfileMock,
  }),
}));

vi.mock("@/contexts/BackendSyncContext", () => ({
  useBackendSync: () => ({
    enabled: true,
    status: "ready",
    lastSyncedAt: "2026-04-17T00:00:00.000Z",
    syncNow: vi.fn(async () => {}),
    syncTargetsNow: syncTargetsNowMock,
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLocalStorage", () => ({
  useLocalStorage: vi.fn(() => [[], vi.fn()]),
}));

vi.mock("@/hooks/useTaskTracking", () => ({
  useTaskTracking: () => ({
    getStreak: () => ({
      current: 0,
      longest: 0,
    }),
    resetAll: vi.fn(),
  }),
}));

vi.mock("@/services/profileAvatarStorage", () => ({
  deleteProfileAvatar: deleteProfileAvatarMock,
  MAX_PROFILE_AVATAR_FILE_BYTES: 2_000_000,
  uploadProfileAvatar: uploadProfileAvatarMock,
}));

describe("SettingsPage", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:avatar-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
    vi.clearAllMocks();
  });

  it("stages avatar uploads until the user saves the profile", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    const fileInput = document.querySelector("#avatar-upload") as HTMLInputElement;
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    expect(uploadProfileAvatarMock).not.toHaveBeenCalled();
    expect(updateProfileMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        avatarUrl: expect.any(String),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(uploadProfileAvatarMock).toHaveBeenCalledWith("firebase-user-001", file),
    );
    expect(updateProfileMock).toHaveBeenCalledWith({
      displayName: "Iris Vale",
      bio: "Writing stories one quiet draft at a time.",
      avatarUrl: "https://firebasestorage.googleapis.com/v0/b/test/o/avatar-next",
    });
    expect(syncTargetsNowMock).toHaveBeenCalledWith(["user"]);
  });

  it("stages avatar removal until the user saves the profile", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    expect(screen.getByText(/upload avatar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove avatar/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /remove avatar/i })).not.toBeInTheDocument(),
    );

    expect(updateProfileMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        avatarUrl: "",
      }),
    );
    expect(deleteProfileAvatarMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({
        displayName: "Iris Vale",
        bio: "Writing stories one quiet draft at a time.",
        avatarUrl: "",
      }),
    );
    expect(deleteProfileAvatarMock).toHaveBeenCalledWith("firebase-user-001");
    expect(syncTargetsNowMock).toHaveBeenCalledWith(["user"]);
  });
});
