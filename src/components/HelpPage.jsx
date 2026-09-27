import React from 'react';
import PropTypes from 'prop-types';
import { getCategoryStyle } from '../utils/categoryStyles';
import {
  ArrowLeft,
  Mic,
  AudioLines,
  Wand2,
  Tags,
  CalendarRange,
  Sparkles,
} from 'lucide-react';

const HelpPage = ({ onBack }) => {
  const quickStart = [
    { title: 'Add items', description: 'Type them, or tap the mic and say several at once.' },
    { title: 'Review suggestions', description: 'Confirm spelling fixes and categories when asked.' },
    { title: 'Shop', description: 'Tap an item to check it off as it goes in the cart.' },
  ];

  const features = [
    {
      Icon: AudioLines,
      title: 'Voice input',
      hue: 265,
      description: 'Say multiple items in one go and they are split and categorized for you.',
      tips: [
        'Speak at a normal pace; items are processed when you stop',
        'Separators like “and”, “then” or a pause all work',
        'Works best somewhere quiet',
      ],
    },
    {
      Icon: Sparkles,
      title: 'Suggestions',
      hue: 330,
      description: 'Items you buy regularly show up when they are probably due again.',
      tips: [
        'Based on how often you have checked items off before',
        'An empty list shows “You’ll probably need”; a busy one shows “Running low?”',
        'Suggested items are marked “Due” in autocomplete',
        'New here? Your most-bought items show until a buying pattern emerges',
      ],
    },
    {
      Icon: Wand2,
      title: 'Spelling fixes',
      hue: 55,
      description: 'Common misspellings are detected and you choose whether to accept the fix.',
      tips: [
        'Keep your original wording or use the correction',
        'Includes Asian and Indian grocery terms',
      ],
    },
    {
      Icon: Tags,
      title: 'Categories',
      hue: 145,
      description: 'Items are grouped into aisles like Produce and Dairy automatically.',
      tips: [
        'Use an item’s ⋯ menu to rename it, change the quantity or move it to another category',
        '400+ grocery items are recognized out of the box',
      ],
    },
    {
      Icon: CalendarRange,
      title: 'Lists by date',
      hue: 215,
      description: 'Each date has its own list, so you can plan future trips.',
      tips: [
        'Switch dates from the sidebar (or tap the title on mobile)',
        'Past lists stay available as read-only history',
        'Move or merge lists into another date from the sidebar',
      ],
    },
  ];

  const voiceCommands = [
    'apples bananas and oranges',
    'milk bread eggs and cheese',
    'basmati rice turmeric and garam masala',
    'chicken breast salmon and ground beef',
    'yogurt ice cream and butter',
  ];

  const categories = [
    { name: 'Produce', items: 'Fruits, vegetables, herbs' },
    { name: 'Dairy', items: 'Milk, cheese, yogurt, eggs' },
    { name: 'Meat & Seafood', items: 'Fresh meat, fish, poultry' },
    { name: 'Asian Pantry', items: 'Rice, noodles, sauces, oils' },
    { name: 'Indian Pantry', items: 'Spices, lentils, flour, ghee' },
    { name: 'Frozen', items: 'Frozen foods, ice cream' },
    { name: 'Beverages', items: 'Drinks, juices, tea, coffee' },
    { name: 'Snacks', items: 'Chips, nuts, sweets' },
    { name: 'Bakery', items: 'Bread, pastries, cakes' },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-2 px-3 sm:px-5 bg-background/80 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-accent text-foreground"
          aria-label="Back to lists"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span className="font-semibold tracking-tight">Help &amp; tips</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        {/* Hero: the three steps on the accent gradient */}
        <section className="hero-gradient rounded-[28px] p-6 mb-10">
          <div className="relative z-10">
            <h1 className="text-[30px] sm:text-4xl font-semibold tracking-tight leading-tight">How it works</h1>
            <p className="text-sm mt-1 opacity-85">Three steps, then the app mostly stays out of your way.</p>

            <ol className="grid sm:grid-cols-3 gap-2.5 mt-6">
              {quickStart.map((item, index) => (
                <li
                  key={item.title}
                  className="rise-in rounded-2xl p-3.5 bg-[color-mix(in_oklch,var(--primary-foreground)_14%,transparent)]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className="size-7 rounded-full bg-primary-foreground text-primary text-sm font-bold flex items-center justify-center tabular-nums mb-2.5">
                    {index + 1}
                  </span>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm opacity-85 mt-0.5">{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <h2 className="section-label mb-3 px-1">Features</h2>
        <div className="space-y-3 mb-12">
          {features.map(({ Icon, title, description, tips, hue }, index) => (
            <section
              key={title}
              className="rise-in cat-card rounded-2xl border bg-card flex gap-4 p-4 sm:p-5"
              style={{ '--cat-h': hue, animationDelay: `${index * 60}ms` }}
            >
              <div className="cat-tile cat-label size-11 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {tips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm">
                      <span className="size-1.5 rounded-full mt-2 shrink-0 bg-[oklch(0.65_0.12_var(--cat-h))]" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <h2 className="section-label mb-3 px-1">Try saying</h2>
        <ul className="flex flex-wrap gap-2 mb-12">
          {voiceCommands.map((command) => (
            <li
              key={command}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm"
            >
              <Mic className="size-3.5 text-primary" />
              &ldquo;{command}&rdquo;
            </li>
          ))}
        </ul>

        <h2 className="section-label mb-3 px-1">Categories</h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {categories.map((category) => {
            const { emoji, hue } = getCategoryStyle(category.name);
            return (
              <li
                key={category.name}
                className="cat-card rounded-2xl border bg-card flex items-center gap-3 px-3 py-2.5"
                style={{ '--cat-h': hue }}
              >
                <span aria-hidden="true" className="cat-tile size-9 rounded-xl flex items-center justify-center text-lg shrink-0">
                  {emoji}
                </span>
                <div className="min-w-0">
                  <p className="cat-label text-sm font-semibold">{category.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{category.items}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
};

HelpPage.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default HelpPage;
