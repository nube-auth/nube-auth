import React from 'react';

export type LoadingSize = 'sm' | 'md' | 'lg';

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: LoadingSize;
  text?: string;
}

const sizeClasses: Record<LoadingSize, { spinner: string; container: string }> = {
  sm: {
    spinner: 'h-4 w-4',
    container: 'gap-2',
  },
  md: {
    spinner: 'h-6 w-6',
    container: 'gap-3',
  },
  lg: {
    spinner: 'h-8 w-8',
    container: 'gap-4',
  },
};

export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ size = 'md', text, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center ${sizeClasses[size].container} ${className}`}
        {...props}
      >
        <div className="animate-spin">
          <svg
            className={`${sizeClasses[size].spinner} text-blue-600`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        {text && <p className="text-gray-600 dark:text-gray-400 m-0">{text}</p>}
      </div>
    );
  }
);

Loading.displayName = 'Loading';
