type Props = {
  className?: string;
};

export function TypingDots({ className }: Props) {
  return (
    <span className={`typing-dots inline-flex ${className ?? ''}`} aria-hidden="true">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}
