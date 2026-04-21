"use client";

export default function ErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return <p>Something went wrong: {error.message}</p>;
}
