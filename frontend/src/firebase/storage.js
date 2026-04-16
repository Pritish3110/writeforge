import { getStorage } from "firebase/storage";
import { app } from "./config.js";

export const storage = getStorage(app);
