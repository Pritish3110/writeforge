import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeleteConfirmationProvider } from "@/components/DeleteConfirmationProvider";
import CustomTaskBuilder from "@/pages/CustomTaskBuilder";

describe("CustomTaskBuilder", () => {
  it("renders the page shell without crashing", () => {
    render(
      <DeleteConfirmationProvider>
        <CustomTaskBuilder />
      </DeleteConfirmationProvider>,
    );

    expect(screen.getByText("Custom Task Builder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create new task/i })).toBeInTheDocument();
  });
});
