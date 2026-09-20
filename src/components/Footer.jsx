import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-auto py-6 text-center border-t border-border">
      <p className="text-sm text-muted-foreground">
        © 2025 Grocery List App. Built by{' '}
        <a
          href="https://github.com/surajfale"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium hover:underline"
        >
          Suraj
        </a>
        {' '}with React + shadcn/ui.
      </p>
    </footer>
  );
};

export default Footer;
