import { deleteFile, uploadFile } from "@/firebase/storage.js";
import { MAX_IMAGE_FILE_BYTES } from "@/lib/imageUtils";

export const MAX_PROFILE_AVATAR_FILE_BYTES = MAX_IMAGE_FILE_BYTES;

export const getProfileAvatarStoragePath = (userId: string) =>
  `avatars/${userId}/profile`;

export const uploadProfileAvatar = async (userId: string, file: File) => {
  const avatarStoragePath = getProfileAvatarStoragePath(userId);
  const avatarUrl = await uploadFile(avatarStoragePath, file);

  return {
    avatarStoragePath,
    avatarUrl,
  };
};

export const deleteProfileAvatar = async (userId: string) =>
  deleteFile(getProfileAvatarStoragePath(userId));
