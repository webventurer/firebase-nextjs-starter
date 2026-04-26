import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });

  it("imports app code via @/ alias", () => {
    expect(cn("a", "b")).toBe("a b");
  });
});
