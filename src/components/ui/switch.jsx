import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-2 focus-visible:ring-primary/30 inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-white pointer-events-none block size-4.5 rounded-full shadow-sm ring-0 transition-transform translate-x-0.5 data-[state=checked]:translate-x-[1.15rem]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
