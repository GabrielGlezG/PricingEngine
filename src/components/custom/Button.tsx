interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2'
  
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-card text-card-foreground border border-border hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'bg-transparent text-primary border border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
  }
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}