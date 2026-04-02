export function formatProgressive(
  digits: string,
  segmentLengths: number[],
  separators: string[],
): string {
  const segments: string[] = [];
  let cursor = 0;

  for (const length of segmentLengths) {
    if (cursor >= digits.length) {
      break;
    }

    const segment = digits.slice(cursor, cursor + length);
    if (segment.length > 0) {
      segments.push(segment);
    }

    cursor += length;
  }

  if (segments.length === 0) {
    return "";
  }

  let output = segments[0] ?? "";
  for (let index = 1; index < segments.length; index += 1) {
    output += `${separators[index - 1] ?? ""}${segments[index] ?? ""}`;
  }

  return output;
}
