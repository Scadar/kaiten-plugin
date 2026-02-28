import * as React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    spacing: {
      '0': 'gap-0',
      px: 'gap-px',
      '0.5': 'gap-0.5',
      '1': 'gap-1',
      '1.5': 'gap-1.5',
      '2': 'gap-2',
      '2.5': 'gap-2.5',
      '3': 'gap-3',
      '3.5': 'gap-3.5',
      '4': 'gap-4',
      '5': 'gap-5',
      '6': 'gap-6',
      '8': 'gap-8',
      '10': 'gap-10',
      '12': 'gap-12',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
    },
  },
  defaultVariants: {
    direction: 'col',
    align: 'stretch',
    justify: 'start',
    spacing: '0',
    wrap: 'nowrap',
  },
});

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof stackVariants> {
  asChild?: boolean;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, align, justify, spacing, wrap, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn(stackVariants({ direction, align, justify, spacing, wrap }), className)}
        {...props}
      />
    );
  },
);
Stack.displayName = 'Stack';

export { Stack, stackVariants };
