import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScrollListingToTop from "./scroll-listing-to-top";

const pathname = vi.fn(() => "/cards/example-slug/abc123");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

describe("ScrollListingToTop", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pathname.mockReset();
    pathname.mockReturnValue("/cards/example-slug/abc123");
  });

  it("scrolls to the top when a listing route mounts or its path changes", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    const { rerender } = render(<ScrollListingToTop />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    pathname.mockReturnValue("/cards/other-slug/xyz789");
    scrollTo.mockClear();
    rerender(<ScrollListingToTop />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
