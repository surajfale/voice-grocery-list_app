import React from 'react';
import { ShoppingBasket, Heart } from 'lucide-react';

// lucide 1.x dropped brand icons, so the GitHub mark is inlined
const GitHubMark = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-current">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="mt-auto pt-14 pb-3">
      {/* Accent hairline, matching the header */}
      <div
        aria-hidden="true"
        className="h-px mb-6 bg-[linear-gradient(90deg,transparent,color-mix(in_oklch,var(--primary)_40%,transparent),transparent)]"
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span className="btn-gradient size-7 rounded-lg flex items-center justify-center" style={{ boxShadow: 'none' }}>
            <ShoppingBasket className="size-4" />
          </span>
          <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(135deg,var(--foreground)_30%,var(--primary))]">
            Grocery List
          </span>
        </div>

        <a
          href="https://github.com/surajfale"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-primary/25 bg-primary/10 text-xs font-medium text-foreground transition-[background-color,border-color,transform] hover:bg-primary/15 hover:border-primary/40 active:scale-[0.97]"
        >
          <GitHubMark />
          Built by Suraj
        </a>

        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          Made with
          <Heart className="size-3 text-primary fill-current" aria-label="love" />
          · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
