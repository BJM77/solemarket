import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScrollListingToTop, { resetListingScrollStateForTests } from "./scroll-listing-to-top";

const pathname = vi.fn(() => "/cards/example-slug/abc123");

vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

function stubNavigationType(type: string) {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type } as unknown as PerformanceEntry]);
}

describe("ScrollListingToTop", () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetListingScrollStateForTests();
    scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    stubNavigationType("navigate");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pathname.mockReset();
    pathname.mockReturnValue("/cards/example-slug/abc123");
  });

  it("opens a listing at the top after clicking through to it", () => {
    const { unmount } = render(<ScrollListingToTop />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    unmount();

    scrollTo.mockClear();
    document.body.click();
    pathname.mockReturnValue("/cards/other-slug/xyz789");
    render(<ScrollListingToTop />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("leaves the restored position alone on Back/Forward", () => {
    const first = render(<ScrollListingToTop />);
    first.unmount();
    scrollTo.mockClear();

    window.dispatchEvent(new PopStateEvent("popstate"));
    pathname.mockReturnValue("/cards/other-slug/xyz789");
    render(<ScrollListingToTop />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not scroll on a page reload", () => {
    stubNavigationType("reload");
    render(<ScrollListingToTop />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not scroll when the document was reached with Back/Forward", () => {
    stubNavigationType("back_forward");
    render(<ScrollListingToTop />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls again on the next click after a Back navigation", () => {
    render(<ScrollListingToTop />).unmount();
    window.dispatchEvent(new PopStateEvent("popstate"));
    document.body.click();
    scrollTo.mockClear();
    pathname.mockReturnValue("/cards/third/abc");
    render(<ScrollListingToTop />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
