import { cn } from "@/lib/utils";

interface OpenBookIllustrationProps {
  className?: string;
}

export function OpenBookIllustration({ className }: OpenBookIllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      aria-hidden="true"
      className={cn("text-foreground/70", className)}
    >
      <path
        d="M32 56.5C32 43.5 42.5 33 55.5 33H118.5C137.7 33 156 40.2 169.8 53.2L173.5 56.6C175.7 58.7 179.2 58.7 181.4 56.6L185.1 53.2C198.9 40.2 217.2 33 236.4 33H264.5C277.5 33 288 43.5 288 56.5V182.5C288 194.4 278.4 204 266.5 204H237.4C218.7 204 200.7 211 187 223.7L183.8 226.6C181.7 228.5 178.3 228.5 176.2 226.6L173 223.7C159.3 211 141.3 204 122.6 204H53.5C41.6 204 32 194.4 32 182.5V56.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M160 63V214"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M56 70H113C129.7 70 145.7 76.3 157.7 87.6L160 89.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M56 97H118C133.4 97 148.2 102.8 160 113.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M56 124H113"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M264 70H207C190.3 70 174.3 76.3 162.3 87.6L160 89.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M264 97H202C186.6 97 171.8 102.8 160 113.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M264 124H207"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
