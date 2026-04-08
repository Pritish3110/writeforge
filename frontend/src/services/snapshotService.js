import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/firestore.js";
import {
  WORKSPACE_COLLECTIONS,
  createEmptyWorkspaceSnapshot,
} from "@/lib/backend/workspaceSnapshot";

const getUserDocRef = (userId) => doc(db, "users", userId);

const getUserCollectionRef = (userId, collectionName) =>
  collection(db, "users", userId, collectionName);

const getUserCollectionDocRef = (userId, collectionName, documentId) =>
  doc(db, "users", userId, collectionName, documentId);

const getWorkspaceRecordId = (snapshotKey, record, index) => {
  const directId =
    typeof record?.id === "string" && record.id.trim()
      ? record.id.trim()
      : null;

  if (directId) {
    return directId;
  }

  const keyedId =
    typeof record?.key === "string" && record.key.trim()
      ? record.key.trim()
      : null;

  return keyedId || `${snapshotKey}-${index + 1}`;
};

const normalizeWorkspaceRecord = (userId, snapshotKey, record, index) => {
  const normalizedRecord =
    record && typeof record === "object" && !Array.isArray(record)
      ? { ...record }
      : { value: record };
  const id = getWorkspaceRecordId(snapshotKey, normalizedRecord, index);

  return {
    ...normalizedRecord,
    id,
    userId,
  };
};

const buildRecordMap = (userId, snapshotKey, records = []) =>
  new Map(
    (Array.isArray(records) ? records : []).map((record, index) => {
      const normalizedRecord = normalizeWorkspaceRecord(
        userId,
        snapshotKey,
        record,
        index,
      );

      return [normalizedRecord.id, normalizedRecord];
    }),
  );

const areSerializedValuesEqual = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const getWorkspaceCollectionConfig = (snapshotKey) => {
  const config = WORKSPACE_COLLECTIONS.find(
    (entry) => entry.snapshotKey === snapshotKey,
  );

  if (!config) {
    throw new Error(`Unsupported workspace section: ${snapshotKey}`);
  }

  return config;
};

export const getSnapshot = async (userId) => {
  try {
    const [userDoc, ...collectionSnapshots] = await Promise.all([
      getDoc(getUserDocRef(userId)),
      ...WORKSPACE_COLLECTIONS.map(({ collectionName }) =>
        getDocs(getUserCollectionRef(userId, collectionName)),
      ),
    ]);

    const snapshot = createEmptyWorkspaceSnapshot(userId);
    snapshot.user = userDoc.exists() ? userDoc.data() : null;

    let hasRemoteData = Boolean(snapshot.user);

    WORKSPACE_COLLECTIONS.forEach(({ snapshotKey }, index) => {
      const records = collectionSnapshots[index].docs.map((entry) => entry.data());
      snapshot[snapshotKey] = records;
      hasRemoteData = hasRemoteData || records.length > 0;
    });

    return hasRemoteData ? snapshot : null;
  } catch (error) {
    console.error(`Unable to load workspace data for ${userId}.`, error);
    throw error;
  }
};

export const saveWorkspaceUser = async (userId, userData) => {
  if (!userData) {
    return null;
  }

  try {
    await setDoc(getUserDocRef(userId), userData, { merge: true });
    return userData;
  } catch (error) {
    console.error(`Unable to save workspace user for ${userId}.`, error);
    throw error;
  }
};

export const syncWorkspaceCollection = async (
  userId,
  snapshotKey,
  records,
  previousRecords = [],
) => {
  const { collectionName } = getWorkspaceCollectionConfig(snapshotKey);
  const currentRecordMap = buildRecordMap(userId, snapshotKey, records);
  const previousRecordMap = buildRecordMap(userId, snapshotKey, previousRecords);
  const batch = writeBatch(db);
  let hasWrites = false;

  currentRecordMap.forEach((record, recordId) => {
    if (!areSerializedValuesEqual(previousRecordMap.get(recordId), record)) {
      batch.set(
        getUserCollectionDocRef(userId, collectionName, recordId),
        record,
        { merge: true },
      );
      hasWrites = true;
    }
  });

  previousRecordMap.forEach((_record, recordId) => {
    if (!currentRecordMap.has(recordId)) {
      batch.delete(getUserCollectionDocRef(userId, collectionName, recordId));
      hasWrites = true;
    }
  });

  if (hasWrites) {
    await batch.commit();
  }

  return Array.from(currentRecordMap.values());
};

export const saveWorkspaceData = async (userId, workspaceData) => {
  try {
    if (workspaceData?.user) {
      await saveWorkspaceUser(userId, workspaceData.user);
    }

    const savedCollections = await Promise.all(
      WORKSPACE_COLLECTIONS.map(async ({ snapshotKey }) => [
        snapshotKey,
        await syncWorkspaceCollection(
          userId,
          snapshotKey,
          workspaceData?.[snapshotKey] || [],
          [],
        ),
      ]),
    );

    return {
      ...createEmptyWorkspaceSnapshot(userId),
      ...Object.fromEntries(savedCollections),
      user: workspaceData?.user || null,
    };
  } catch (error) {
    console.error(`Unable to save workspace data for ${userId}.`, error);
    throw error;
  }
};

export const saveWorkspaceRecord = async (userId, snapshotKey, record) => {
  const { collectionName } = getWorkspaceCollectionConfig(snapshotKey);
  const normalizedRecord = normalizeWorkspaceRecord(userId, snapshotKey, record, 0);

  try {
    await setDoc(
      getUserCollectionDocRef(userId, collectionName, normalizedRecord.id),
      normalizedRecord,
      { merge: true },
    );

    return normalizedRecord;
  } catch (error) {
    console.error(
      `Unable to save ${snapshotKey} record ${normalizedRecord.id} for ${userId}.`,
      error,
    );
    throw error;
  }
};

export const saveDraft = async (userId, draft) =>
  saveWorkspaceRecord(userId, "drafts", draft);

export const saveTask = async (userId, task) =>
  saveWorkspaceRecord(userId, "taskRecords", task);

export const deleteWorkspace = async (userId) => {
  try {
    await Promise.all(
      WORKSPACE_COLLECTIONS.map(async ({ collectionName }) => {
        const querySnapshot = await getDocs(
          getUserCollectionRef(userId, collectionName),
        );

        await Promise.all(
          querySnapshot.docs.map((record) =>
            deleteDoc(
              getUserCollectionDocRef(userId, collectionName, record.id),
            ),
          ),
        );
      }),
    );

    await deleteDoc(getUserDocRef(userId));
  } catch (error) {
    console.error(`Unable to delete workspace data for ${userId}.`, error);
    throw error;
  }
};

export const saveSnapshot = saveWorkspaceData;
export const deleteSnapshot = deleteWorkspace;
