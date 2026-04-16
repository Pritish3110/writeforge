export const MAX_BOOK_COVER_FILE_BYTES = 2_000_000;

export const uploadBookCover = async (
  _userId: string,
  _bookId: string,
  file: File,
) => {
  const coverUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The cover image could not be read on this device."));
    };

    reader.onerror = () => {
      reject(new Error("The cover image could not be read on this device."));
    };

    reader.readAsDataURL(file);
  });

  return {
    coverUrl,
    coverStoragePath: null,
  };
};

export const getBookCoverUploadErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Please try again with a different image on this device.";
};

export const deleteBookCover = async (_coverStoragePath: string | null) => {};
