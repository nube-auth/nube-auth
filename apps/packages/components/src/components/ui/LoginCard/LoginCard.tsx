import React from 'react';

export interface LoginCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  error?: string;
  loading?: boolean;
}

export interface LoginCardLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface LoginCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export interface LoginCardSubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export interface LoginCardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface LoginCardTermsProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export interface LoginCardErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
}

export const LoginCard = React.forwardRef<HTMLDivElement, LoginCardProps>(
  ({ className = '', children, error, loading, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`w-full max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden ${className}`}
        {...props}
      >
        {error && <LoginCardError message={error} />}
        {loading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 flex items-center justify-center z-50">
            <div className="animate-spin">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
        )}
        <div className={loading ? 'opacity-50 pointer-events-none' : ''}>{children}</div>
      </div>
    );
  }
);

LoginCard.displayName = 'LoginCard';

export const LoginCardLogo = React.forwardRef<HTMLDivElement, LoginCardLogoProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center pt-8 pb-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

LoginCardLogo.displayName = 'LoginCardLogo';

export const LoginCardTitle = React.forwardRef<HTMLHeadingElement, LoginCardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h1
        ref={ref}
        className={`text-2xl font-bold text-center text-gray-900 dark:text-white px-6 m-0 ${className}`}
        {...props}
      >
        {children}
      </h1>
    );
  }
);

LoginCardTitle.displayName = 'LoginCardTitle';

export const LoginCardSubtitle = React.forwardRef<HTMLParagraphElement, LoginCardSubtitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-center text-gray-600 dark:text-gray-400 px-6 pt-2 pb-6 m-0 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

LoginCardSubtitle.displayName = 'LoginCardSubtitle';

export const LoginCardBody = React.forwardRef<HTMLDivElement, LoginCardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 pb-6 space-y-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

LoginCardBody.displayName = 'LoginCardBody';

export const LoginCardTerms = React.forwardRef<HTMLParagraphElement, LoginCardTermsProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-center text-xs text-gray-600 dark:text-gray-400 px-6 pb-6 m-0 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

LoginCardTerms.displayName = 'LoginCardTerms';

export const LoginCardError = React.forwardRef<HTMLDivElement, LoginCardErrorProps>(
  ({ message, className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-800 px-6 py-3 ${className}`}
      >
        <p className="text-sm text-red-800 dark:text-red-200 m-0">{message}</p>
      </div>
    );
  }
);

LoginCardError.displayName = 'LoginCardError';
