"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-black text-white flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button
            onClick={() => reset()}
            className="bg-gold-400 text-black px-4 py-2 rounded"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}