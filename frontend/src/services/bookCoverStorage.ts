import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage } from "@/firebase/storage.js";

const sanitizeFileSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cover";

export const uploadBookCover = async (
  userId: string,
  bookId: string,
  file: File,
) => {
  const extension =
    sanitizeFileSegment(file.name.split(".").pop() || "") || "png";
  const storagePath = `users/${userId}/books/${bookId}/cover-${Date.now()}.${extension}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  const coverUrl = await getDownloadURL(storageRef);

  return {
    coverUrl,
    coverStoragePath: storagePath,
  };
};

export const deleteBookCover = async (coverStoragePath: string | null) => {
  if (!coverStoragePath) {
    return;
  }

  try {
    await deleteObject(ref(storage, coverStoragePath));
  } catch (error) {
    console.error(`Unable to delete cover asset at ${coverStoragePath}.`, error);
  }
};
