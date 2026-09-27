import React from 'react';
import PropTypes from 'prop-types';
import { ShoppingBasket } from 'lucide-react';

/**
 * Shared shell for the sign-in / sign-up / password pages:
 * brand mark, heading, form, and the learning-project footnote.
 */
const AuthLayout = ({ title, subtitle = null, children }) => (
  <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
    <main className="w-full max-w-sm">
      <div className="flex items-center gap-2.5 mb-10">
        <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
          <ShoppingBasket className="size-5" />
        </div>
        <span className="font-semibold tracking-tight">Grocery List</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}

      <div className="mt-7">{children}</div>

      <p className="mt-12 text-xs text-muted-foreground">
        A personal learning project. Availability isn&apos;t guaranteed and data may be reset.
      </p>
    </main>
  </div>
);

AuthLayout.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default AuthLayout;
