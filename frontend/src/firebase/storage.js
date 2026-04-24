import {
  deleteObject,
  getBlob,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { app, firebaseConfig } from "./config.js";

const toStorageBucketUrl = (bucketName) => {
  if (!bucketName) {
    return undefined;
  }

  if (
    bucketName.startsWith("gs://") ||
    bucketName.startsWith("http://") ||
    bucketName.startsWith("https://")
  ) {
    return bucketName;
  }

  return `gs://${bucketName}`;
};

export const storage = getStorage(
  app,
  toStorageBucketUrl(firebaseConfig.storageBucket),
);

/**
 * Uploads a file to Firebase Storage and returns the public download URL.
 *
 * @param {string} storagePath — Full path in the bucket (e.g. "covers/uid/bookId/cover").
 * @param {File | Blob} file — The file or blob to upload.
 * @returns {Promise<string>} The persistent download URL.
 */
export const uploadFile = async (storagePath, file) => {
  const storageRef = ref(storage, storagePath);

  const metadata = {};
  if (file.type) {
    metadata.contentType = file.type;
  }

  await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
};

/**
 * Returns the download URL for an existing file in Firebase Storage.
 *
 * @param {string} storagePath — Full path in the bucket.
 * @returns {Promise<string | null>} The download URL, or null if the file is missing.
 */
export const getFileUrl = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    if (error?.code === "storage/object-not-found") {
      return null;
    }

    console.error("Failed to get file download URL.", error);
    return null;
  }
};

/**
 * Deletes a file from Firebase Storage. Silently ignores "not found" errors.
 *
 * @param {string} storagePath — Full path in the bucket.
 * @returns {Promise<void>}
 */
export const deleteFile = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    if (error?.code === "storage/object-not-found") {
      return;
    }

    console.error("Failed to delete file from storage.", error);
  }
};

/**
 * Downloads a file from Firebase Storage as a Blob (bypasses CORS).
 *
 * @param {string} storagePath — Full path in the bucket.
 * @returns {Promise<Blob | null>} The file blob, or null if not found.
 */
export const getFileBlob = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    return await getBlob(storageRef);
  } catch (error) {
    if (error?.code === "storage/object-not-found") {
      return null;
    }

    console.error("Failed to download file blob.", error);
    return null;
  }
};
