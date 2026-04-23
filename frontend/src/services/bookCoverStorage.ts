import { deleteFile, getFileUrl, uploadFile } from "@/firebase/storage.js";
import { MAX_IMAGE_FILE_BYTES } from "@/lib/imageUtils";

export const MAX_BOOK_COVER_FILE_BYTES = MAX_IMAGE_FILE_BYTES;

// ---------------------------------------------------------------------------
// Public API — Firebase Storage backed
// ---------------------------------------------------------------------------

/**
 * Uploads a book cover image to Firebase Storage.
 *
 * Uses a fixed path per book so replacing the cover overwrites the old file
 * (no orphan files, no extra storage cost).
 *
 * @returns `{ coverUrl, coverStoragePath }` — the download URL and the storage path.
 */
export const uploadBookCover = async (
  userId: string,
  bookId: string,
  file: File,
) => {
  const coverStoragePath = `books/${userId}/${bookId}/cover`;
  const coverUrl = await uploadFile(coverStoragePath, file);

  return {
    coverUrl,
    coverStoragePath,
  };
};

export const getBookCoverUploadErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Please try again with a different image.";
};

/**
 * Deletes a book cover from Firebase Storage.
 */
export const deleteBookCover = async (coverStoragePath: string | null) => {
  if (!coverStoragePath) {
    return;
  }

  try {
    await deleteFile(coverStoragePath);
  } catch (error) {
    console.error("Failed to delete cover from storage.", error);
  }
};

/**
 * Returns the persistent download URL for a book cover stored in Firebase Storage.
 * Returns `null` when no path is provided or the file is missing.
 */
export const loadBookCoverUrl = async (
  coverStoragePath: string | null,
): Promise<string | null> => {
  if (!coverStoragePath) {
    return null;
  }

  try {
    return await getFileUrl(coverStoragePath);
  } catch {
    return null;
  }
};
