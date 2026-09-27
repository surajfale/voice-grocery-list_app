import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-auto pt-12 pb-2 text-center">
      <p className="text-xs text-muted-foreground">
        Built by{' '}
        <a
          href="https://github.com/surajfale"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"
        >
          Suraj
        </a>
        {' '}· © {new Date().getFullYear()}
      </p>
    </footer>
  );
};

export default Footer;
