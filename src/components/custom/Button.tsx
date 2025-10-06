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
    primary: 'bg-[#B17A50] text-white hover:bg-[#9A6847] active:bg-[#8A5D42] disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-[#1E1E1E] text-white border border-[#2A2A2A] hover:border-[#B17A50] disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'bg-transparent text-[#B17A50] border border-[#B17A50] hover:bg-[#B17A50] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
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