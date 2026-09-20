import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-card! text-foreground! border-border! shadow-lg! rounded-xl!',
          description: 'text-muted-foreground!',
          actionButton: 'bg-primary! text-primary-foreground!',
          cancelButton: 'bg-muted! text-muted-foreground!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
