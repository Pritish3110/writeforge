/**
 * Maximum allowed file size for image uploads.
 */
export const MAX_IMAGE_FILE_BYTES = 2_000_000; // 2 MB

/**
 * Accepted MIME types for image uploads.
 */
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Validates that a file is an acceptable image and within the size limit.
 * Returns an error message string if invalid, or `null` if valid.
 */
export const validateImageFile = (
  file: File,
  maxBytes = MAX_IMAGE_FILE_BYTES,
): string | null => {
  if (!file.type || !ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Choose a PNG, JPG, WebP, or GIF image file.";
  }

  if (file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / 1_000_000);
    return `Choose an image under ${limitMb} MB.`;
  }

  return null;
};
