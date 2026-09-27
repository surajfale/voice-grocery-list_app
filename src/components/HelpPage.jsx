import React from 'react';
import PropTypes from 'prop-types';
import {
  ArrowLeft,
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
      description: 'Items you buy regularly show up when they are probably due again.',
      tips: [
        'Based on how often you have checked items off before',
        'An empty list shows “You’ll probably need”; a busy one shows “Running low?”',
        'Suggested items are marked “Due” in autocomplete',
      ],
    },
    {
      Icon: Wand2,
      title: 'Spelling fixes',
      description: 'Common misspellings are detected and you choose whether to accept the fix.',
      tips: [
        'Keep your original wording or use the correction',
        'Includes Asian and Indian grocery terms',
      ],
    },
    {
      Icon: Tags,
      title: 'Categories',
      description: 'Items are grouped into aisles like Produce and Dairy automatically.',
      tips: [
        'Use an item’s ⋯ menu to rename it, change the quantity or move it to another category',
        '400+ grocery items are recognized out of the box',
      ],
    },
    {
      Icon: CalendarRange,
      title: 'Lists by date',
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
        <h1 className="text-[28px] sm:text-3xl font-semibold tracking-tight">How it works</h1>
        <p className="text-muted-foreground mt-1 mb-8">Three steps, then the app mostly stays out of your way.</p>

        <ol className="space-y-4 mb-12">
          {quickStart.map((item, index) => (
            <li key={item.title} className="flex gap-4">
              <span className="size-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center shrink-0 tabular-nums">
                {index + 1}
              </span>
              <div className="pt-0.5">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="section-label mb-3 px-1">Features</h2>
        <div className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border mb-12">
          {features.map(({ Icon, title, description, tips }) => (
            <section key={title} className="flex gap-4 p-4 sm:p-5">
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-4.5 text-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                <ul className="mt-2.5 space-y-1">
                  {tips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm">
                      <span className="size-1 rounded-full bg-muted-foreground/60 mt-2 shrink-0" />
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
            <li key={command} className="rounded-full bg-muted px-3 py-1.5 text-sm">
              &ldquo;{command}&rdquo;
            </li>
          ))}
        </ul>

        <h2 className="section-label mb-3 px-1">Categories</h2>
        <dl className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
          {categories.map((category) => (
            <div key={category.name} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-sm font-medium">{category.name}</dt>
              <dd className="text-sm text-muted-foreground text-right">{category.items}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
};

HelpPage.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default HelpPage;
