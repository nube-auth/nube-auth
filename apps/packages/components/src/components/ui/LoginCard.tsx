import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

// ============================================================================
// LoginCard - Container
// ============================================================================

export interface LoginCardProps {
  children: ReactNode;
  className?: string;
}

export function LoginCard({ children, className }: LoginCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full px-6 bg-background">
      <div className={cn(
        'flex flex-col items-center w-full max-w-md px-8 py-10',
        'bg-card border border-card-border rounded-xl shadow',
        className
      )}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// LoginCard Logo
// ============================================================================

export interface LoginCardLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export function LoginCardLogo({ src, alt, className }: LoginCardLogoProps) {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={cn('w-12 h-12 mx-auto mb-4', className)} 
    />
  );
}

// ============================================================================
// LoginCard Title
// ============================================================================

export interface LoginCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function LoginCardTitle({ children, className }: LoginCardTitleProps) {
  return (
    <h1 className={cn(
      'text-[28px] font-bold text-foreground mb-2 text-center',
      className
    )}>
      {children}
    </h1>
  );
}

// ============================================================================
// LoginCard Subtitle
// ============================================================================

export interface LoginCardSubtitleProps {
  children: ReactNode;
  className?: string;
}

export function LoginCardSubtitle({ children, className }: LoginCardSubtitleProps) {
  return (
    <p className={cn(
      'text-sm text-muted text-center mb-8',
      className
    )}>
      {children}
    </p>
  );
}

// ============================================================================
// LoginCard Body
// ============================================================================

export interface LoginCardBodyProps {
  children: ReactNode;
  className?: string;
}

export function LoginCardBody({ children, className }: LoginCardBodyProps) {
  return (
    <div className={cn('w-full', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// LoginCard Terms
// ============================================================================

export interface LoginCardTermsProps {
  children: ReactNode;
  className?: string;
}

export function LoginCardTerms({ children, className }: LoginCardTermsProps) {
  return (
    <p className={cn(
      'text-xs text-dimmed text-center leading-relaxed',
      className
    )}>
      {children}
    </p>
  );
}

// ============================================================================
// LoginCard Error
// ============================================================================

export interface LoginCardErrorProps {
  children: ReactNode;
  className?: string;
}

export function LoginCardError({ children, className }: LoginCardErrorProps) {
  return (
    <div className={cn(
      'w-14 h-14 bg-danger/10 text-danger rounded-lg',
      'flex items-center justify-center mx-auto mb-5',
      className
    )}>
      {children}
    </div>
  );
}
