export function assertOptions(options: unknown): void {
  if (options === undefined) return;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    const received = options === null ? "null" : Array.isArray(options) ? "array" : typeof options;
    throw new TypeError(`Expected an options object, but received ${received}`);
  }
}
