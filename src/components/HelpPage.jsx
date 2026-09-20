import React from 'react';
import PropTypes from 'prop-types';
import {
  ArrowLeft,
  Mic,
  Pencil,
  Tags,
  CalendarRange,
  CircleCheck,
  AudioLines,
  Wand2,
} from 'lucide-react';
import { Card } from './ui/card';

const HelpPage = ({ onBack }) => {
  const features = [
    {
      icon: <AudioLines className="size-6" />,
      title: 'Voice Recognition',
      description: 'Say multiple items at once and our AI will automatically separate and categorize them',
      color: 'var(--primary)',
      tips: [
        'Speak clearly and at normal pace',
        'You can say multiple items in one session',
        'The app will process all items when you stop speaking',
        'Works best in quiet environments',
      ],
    },
    {
      icon: <Wand2 className="size-6" />,
      title: 'Smart Auto-correction',
      description: 'AI automatically detects and suggests corrections for misspelled items',
      color: 'var(--warning)',
      tips: [
        'Common misspellings are automatically detected',
        'You can choose to keep original or use corrections',
        'Supports Asian and Indian grocery terms',
        'Learning improves over time',
      ],
    },
    {
      icon: <Tags className="size-6" />,
      title: 'Intelligent Categorization',
      description: 'Items are automatically sorted into relevant categories like Produce, Dairy, etc.',
      color: 'var(--success)',
      tips: [
        'Supports 8+ categories including Asian & Indian Pantry',
        'Click edit icon to manually change categories',
        'AI learns from your preferences',
        '400+ pre-loaded grocery items in database',
      ],
    },
    {
      icon: <CalendarRange className="size-6" />,
      title: 'Date-based Lists',
      description: 'Each date gets its own separate grocery list for better organization',
      color: 'var(--secondary)',
      tips: [
        'Switch between dates using the sidebar',
        'Create lists for future shopping trips',
        'Past lists remain accessible',
        'Easy date picker for quick navigation',
      ],
    },
  ];

  const quickStart = [
    { step: 1, title: 'Add Items', description: 'Use the voice button or type items manually', icon: <Mic className="size-7" /> },
    { step: 2, title: 'Review Suggestions', description: 'Check auto-corrections and categorization', icon: <Pencil className="size-7" /> },
    { step: 3, title: 'Shop Smart', description: 'Check off items as you shop', icon: <CircleCheck className="size-7" /> },
  ];

  const voiceCommands = [
    'apples bananas and oranges',
    'milk bread eggs and cheese',
    'basmati rice turmeric and garam masala',
    'chicken breast salmon and ground beef',
    'yogurt ice cream and butter',
  ];

  const categories = [
    { name: 'Produce', color: '#10B981', items: 'Fruits, vegetables, herbs' },
    { name: 'Dairy', color: '#3B82F6', items: 'Milk, cheese, yogurt, eggs' },
    { name: 'Meat & Seafood', color: '#EF4444', items: 'Fresh meat, fish, poultry' },
    { name: 'Asian Pantry', color: '#8B5CF6', items: 'Rice, noodles, sauces, oils' },
    { name: 'Indian Pantry', color: '#F59E0B', items: 'Spices, lentils, flour, ghee' },
    { name: 'Frozen', color: '#06B6D4', items: 'Frozen foods, ice cream' },
    { name: 'Beverages', color: '#84CC16', items: 'Drinks, juices, tea, coffee' },
    { name: 'Snacks', color: '#F97316', items: 'Chips, nuts, sweets' },
    { name: 'Bakery', color: '#EC4899', items: 'Bread, pastries, cakes' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Help Page Header */}
      <header className="sticky top-0 z-30 h-[72px] flex items-center px-4 sm:px-6 bg-card/90 backdrop-blur-xl border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="mr-3 p-2.5 rounded-xl hover:bg-primary/8 text-foreground"
          aria-label="Back"
        >
          <ArrowLeft />
        </button>

        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-xl">
            💡
          </div>
          <div>
            <h6 className="font-display font-bold">Help &amp; Guide</h6>
            <p className="text-xs text-muted-foreground">Learn how to use Grocery Voice List effectively</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Quick Start Section */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-8 bg-primary text-white">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)' }}
          />
          <div className="relative">
            <h4 className="font-display text-2xl sm:text-3xl font-bold mb-2">Getting Started</h4>
            <p className="opacity-90 mb-6">Follow these simple steps to create your first smart grocery list</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {quickStart.map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur"
                >
                  <div className="size-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                    {item.icon}
                  </div>
                  <p className="font-semibold mb-1">{item.step}. {item.title}</p>
                  <p className="text-sm opacity-90">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <h4 className="font-display text-2xl font-bold mb-4">Key Features</h4>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="size-12 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: feature.color }}
                >
                  {feature.icon}
                </div>
                <p className="font-display font-bold">{feature.title}</p>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>

              <p className="text-sm font-semibold mb-1.5">Tips &amp; Best Practices:</p>
              <ul className="space-y-1.5">
                {feature.tips.map((tip, tipIndex) => (
                  <li key={tipIndex} className="flex items-start gap-2 text-sm">
                    <span
                      className="size-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: feature.color }}
                    />
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Voice Commands Examples */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
              <Mic className="text-white size-5" />
            </div>
            <h5 className="font-display text-xl font-bold">Voice Command Examples</h5>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Try these example phrases with the voice recognition feature:
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {voiceCommands.map((command, index) => (
              <div key={index} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm italic text-primary">&quot;{command}&quot;</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Categories Information */}
        <Card className="p-6">
          <h5 className="font-display text-xl font-bold mb-3">Smart Categories</h5>

          <p className="text-sm text-muted-foreground mb-4">
            Items are automatically organized into these categories:
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div key={category.name} className="p-3 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="size-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-sm font-semibold">{category.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{category.items}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

HelpPage.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default HelpPage;
