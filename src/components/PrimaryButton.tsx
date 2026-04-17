import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'success' | 'danger' | 'neutral';
type Size = 'sm' | 'lg' | 'xl';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'tap-btn-primary',
  success: 'tap-btn-success',
  danger: 'tap-btn-danger',
  neutral: 'tap-btn-neutral'
};
const sizeClass: Record<Size, string> = {
  sm: 'tap-btn-sm',
  lg: 'tap-btn-lg',
  xl: 'tap-btn-xl'
};

export default function PrimaryButton({ variant = 'primary', size = 'lg', className = '', ...rest }: Props) {
  return <button {...rest} className={`${variantClass[variant]} ${sizeClass[size]} ${className}`} />;
}
