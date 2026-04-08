import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { resetStorageAdapter } from "@/lib/backend/storageAdapter";

let previousSetter: unknown;

const SetterProbe = ({ tick }: { tick: number }) => {
  const [, setStored] = useLocalStorage<string[]>("test-storage-key", []);
  const isStable = !previousSetter || previousSetter === setStored;
  previousSetter = setStored;

  return (
    <div>
      <span data-testid="tick">{tick}</span>
      <span data-testid="setter-stable">{String(isStable)}</span>
    </div>
  );
};

describe("useLocalStorage", () => {
  beforeEach(() => {
    resetStorageAdapter();
    previousSetter = undefined;
  });

  it("keeps the setter reference stable across rerenders", () => {
    const { rerender } = render(<SetterProbe tick={1} />);

    expect(screen.getByTestId("setter-stable")).toHaveTextContent("true");

    rerender(<SetterProbe tick={2} />);

    expect(screen.getByTestId("setter-stable")).toHaveTextContent("true");
  });
});
