export type CharacterPriorityType =
  | "Main Character"
  | "Side Character"
  | "Activity Character";

export interface CharacterPriorityTarget {
  name: string;
  type?: string;
  pinned?: boolean;
}

const CHARACTER_TYPE_PRIORITY: Record<CharacterPriorityType, number> = {
  "Main Character": 0,
  "Side Character": 1,
  "Activity Character": 2,
};

const getCharacterTypePriority = (type?: string) =>
  type && type in CHARACTER_TYPE_PRIORITY
    ? CHARACTER_TYPE_PRIORITY[type as CharacterPriorityType]
    : Number.MAX_SAFE_INTEGER;

export const compareCharactersByPriority = <
  T extends CharacterPriorityTarget,
>(
  left: T,
  right: T,
) => {
  const typePriorityDifference =
    getCharacterTypePriority(left.type) - getCharacterTypePriority(right.type);
  if (typePriorityDifference !== 0) return typePriorityDifference;

  if (Boolean(left.pinned) !== Boolean(right.pinned)) {
    return left.pinned ? -1 : 1;
  }

  const nameComparison = left.name.localeCompare(right.name);
  if (nameComparison !== 0) return nameComparison;

  return 0;
};

export const sortCharactersByPriority = <
  T extends CharacterPriorityTarget,
>(
  characters: T[],
) => [...characters].sort(compareCharactersByPriority);
