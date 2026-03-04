import React from 'react';

export interface ProfileHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  email: string;
  meta?: string;
  avatar?: React.ReactNode;
}

export const ProfileHeader = React.forwardRef<HTMLDivElement, ProfileHeaderProps>(
  ({ name, email, meta, avatar, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start gap-4 ${className}`}
        {...props}
      >
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white m-0">{name}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 mb-0">{email}</p>
          {meta && <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 mb-0">{meta}</p>}
        </div>
      </div>
    );
  }
);

ProfileHeader.displayName = 'ProfileHeader';
