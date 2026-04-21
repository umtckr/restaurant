export function cn(..._parts: (string | false | undefined)[]) {
  return _parts.filter(Boolean).join(" ");
}
