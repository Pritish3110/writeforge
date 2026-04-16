import { getStorage } from "firebase/storage";
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
