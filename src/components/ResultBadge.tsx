export function ResultBadge({ result }: { result: "Win" | "Loss" | "Pending" }) {
  const color =
    result === "Win"
      ? "text-green-500"
      : result === "Loss"
      ? "text-red-500"
      : "text-gray-500";
  return <span className={`font-medium ${color}`}>{result}</span>;
}