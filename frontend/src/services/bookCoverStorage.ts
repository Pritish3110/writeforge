import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { FirebaseError } from "firebase/app";
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

export const getBookCoverUploadErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "storage/unauthorized":
        return "Firebase Storage denied the upload. Keep rules enabled, but make sure they allow the signed-in user to write to users/<uid>/books/<bookId>/...";
      case "storage/unauthenticated":
        return "The browser is not authenticated with Firebase right now. Sign out, sign back in, and try the upload again.";
      case "storage/bucket-not-found":
      case "storage/project-not-found":
        return "The Firebase Storage bucket is misconfigured. Verify VITE_FIREBASE_STORAGE_BUCKET or src/firebase/config.js against your Firebase project.";
      case "storage/canceled":
        return "The upload was canceled before Firebase finished receiving the image.";
      default:
        return error.message || "Firebase rejected the upload.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Please try again with the same image or a different one.";
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
