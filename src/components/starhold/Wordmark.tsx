/** The STARHOLD logotype. `as` lets a page use it as its h1. */
export function Wordmark({
  size = "md",
  as: Tag = "span",
}: {
  size?: "sm" | "md" | "lg";
  as?: "span" | "h1" | "p";
}) {
  const sizes = { sm: "text-sm", md: "text-2xl", lg: "text-4xl sm:text-5xl" };
  return (
    <Tag className={`font-display font-bold tracking-[0.28em] text-ink uppercase ${sizes[size]}`}>
      Starhold
    </Tag>
  );
}
