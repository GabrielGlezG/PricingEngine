interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-card text-card-foreground border border-border rounded-lg px-4 py-2 focus:outline-none focus:border-primary transition-colors ${className}`}
      {...props}
    />
  )
}
