import React from 'react';
import PropTypes from 'prop-types';
import { ShoppingBasket, Mic, Sparkles, ReceiptText, Check } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryStyles';

const FEATURES = [
  { Icon: Mic, text: 'Say “milk, eggs and spinach” and it’s sorted by aisle' },
  { Icon: Sparkles, text: 'Suggests what you’re running low on' },
  { Icon: ReceiptText, text: 'Scan receipts and ask where your money went' },
];

// Decorative mini list for the hero panel (not interactive)
const PREVIEW_ITEMS = [
  { text: 'Spinach', category: 'Produce', done: true },
  { text: 'Paneer', category: 'Dairy', done: false },
  { text: 'Toor dal', category: 'Indian Pantry', done: false },
];

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <div className="size-9 rounded-xl flex items-center justify-center bg-[color-mix(in_oklch,var(--primary-foreground)_18%,transparent)]">
      <ShoppingBasket className="size-5" />
    </div>
    <span className="font-semibold tracking-tight">Grocery List</span>
  </div>
);

const PreviewCard = () => (
  <div
    aria-hidden="true"
    className="rise-in w-full max-w-xs rounded-3xl bg-card text-card-foreground p-4 shadow-2xl rotate-[-3deg]"
    style={{ animationDelay: '200ms' }}
  >
    <div className="flex items-baseline justify-between mb-3 px-1">
      <p className="font-semibold">Today</p>
      <p className="text-xs text-muted-foreground tabular-nums">2 of 3 left</p>
    </div>
    <ul className="space-y-2">
      {PREVIEW_ITEMS.map(({ text, category, done }, index) => {
        const { emoji, hue } = getCategoryStyle(category);
        return (
          <li
            key={text}
            className="rise-in flex items-center gap-3 rounded-2xl border px-3 py-2.5 cat-card"
            style={{ '--cat-h': hue, animationDelay: `${320 + index * 90}ms` }}
          >
            <span className="cat-tile size-8 rounded-[10px] flex items-center justify-center text-base">{emoji}</span>
            <span className={`flex-1 text-sm ${done ? 'text-muted-foreground line-through' : ''}`}>{text}</span>
            <span
              className={`size-5 rounded-full border-2 flex items-center justify-center ${
                done ? 'bg-primary border-primary text-primary-foreground' : 'cat-check'
              }`}
            >
              {done && <Check className="size-3" strokeWidth={3} />}
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

/**
 * Shared shell for the sign-in / sign-up / password pages.
 * Desktop: gradient story panel on the left, form on the right.
 * Mobile: gradient header with the form card overlapping it.
 */
const DEFAULT_FOOTER = (
  <p className="text-xs text-muted-foreground text-center">
    A personal learning project. Availability isn&apos;t guaranteed and data may be reset.
  </p>
);

const AuthLayout = ({ title, subtitle = null, children, footer = DEFAULT_FOOTER }) => (
  <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
    {/* Story panel (desktop) */}
    <aside className="hidden lg:flex hero-gradient m-4 rounded-[32px] p-10 flex-col justify-between">
      <div className="relative z-10 flex flex-col gap-10 h-full">
        <Brand />
        <div className="flex-1 flex flex-col justify-center gap-10">
          <div className="rise-in">
            <h2 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05] max-w-md">
              Your grocery list, ready before you are.
            </h2>
            <ul className="mt-6 space-y-3 max-w-md">
              {FEATURES.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[15px] opacity-90">
                  <span className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-[color-mix(in_oklch,var(--primary-foreground)_16%,transparent)]">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <PreviewCard />
        </div>
      </div>
    </aside>

    {/* Header (mobile) */}
    <div className="lg:hidden hero-gradient rounded-b-[32px] px-6 pt-8 pb-16">
      <div className="relative z-10">
        <Brand />
        <p className="mt-6 text-2xl font-semibold tracking-tight leading-tight max-w-xs">
          Your grocery list, ready before you are.
        </p>
      </div>
    </div>

    {/* Form */}
    <div className="flex flex-col items-center justify-center px-4 sm:px-6 pb-10 lg:py-10">
      <main className="w-full max-w-sm -mt-10 lg:mt-0 rounded-3xl bg-card lg:bg-transparent p-6 lg:p-0 shadow-xl lg:shadow-none border lg:border-0 border-border relative">
        <div className="stagger-children">
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>

      {footer && <div className="mt-8 w-full max-w-sm">{footer}</div>}
    </div>
  </div>
);

AuthLayout.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node.isRequired,
  // Shown under the form; sign-in/sign-up pass the personal-use notice
  footer: PropTypes.node,
};

export default AuthLayout;
