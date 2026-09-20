import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
        'placeholder:text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
        'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
