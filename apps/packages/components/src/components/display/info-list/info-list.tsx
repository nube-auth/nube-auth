import React from 'react';

export interface InfoListItemProps {
  label: string;
  description?: string;
  value: React.ReactNode;
}

export interface InfoListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: InfoListItemProps[];
}

export const InfoList = React.forwardRef<HTMLDivElement, InfoListProps>(
  ({ items, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`space-y-4 ${className}`}
        {...props}
      >
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between gap-4 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white m-0">{item.label}</p>
              {item.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-0">{item.description}</p>
              )}
            </div>
            <div className="text-right text-sm text-gray-700 dark:text-gray-300">{item.value}</div>
          </div>
        ))}
      </div>
    );
  }
);

InfoList.displayName = 'InfoList';
