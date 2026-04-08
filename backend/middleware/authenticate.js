import { adminAuth } from "../config/firebaseAdmin.js";

const extractBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
};

export const authenticateRequest = async (request, response, next) => {
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    response.status(401).json({
      success: false,
      error: "Missing Bearer token.",
    });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    request.user = decodedToken;
    next();
  } catch (error) {
    console.error("Firebase Auth verification failed.", error);
    response.status(401).json({
      success: false,
      error: "Invalid or expired Firebase ID token.",
    });
  }
};
