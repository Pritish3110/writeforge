import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore.js";

export const getSnapshot = async (userId) => {
  try {
    const snapshotRef = doc(db, "snapshots", userId);
    const snapshotDoc = await getDoc(snapshotRef);

    if (!snapshotDoc.exists()) {
      return null;
    }

    return snapshotDoc.data();
  } catch (error) {
    console.error(`Unable to load workspace snapshot for ${userId}.`, error);
    throw error;
  }
};

export const saveSnapshot = async (userId, data) => {
  try {
    const snapshotRef = doc(db, "snapshots", userId);
    await setDoc(snapshotRef, data);
    return data;
  } catch (error) {
    console.error(`Unable to save workspace snapshot for ${userId}.`, error);
    throw error;
  }
};

export const deleteSnapshot = async (userId) => {
  try {
    const snapshotRef = doc(db, "snapshots", userId);
    await deleteDoc(snapshotRef);
  } catch (error) {
    console.error(`Unable to delete workspace snapshot for ${userId}.`, error);
    throw error;
  }
};
