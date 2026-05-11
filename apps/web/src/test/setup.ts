import "@testing-library/jest-dom/vitest";

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Provide no-op stubs so vi.spyOn can replace them in tests.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
