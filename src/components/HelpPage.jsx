import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack,
  Mic,
  Edit,
  Category,
  DateRange,
  CheckCircle,
  VoiceChat,
  AutoFixHigh,
  // ...existing imports
} from '@mui/icons-material';

const HelpPage = ({ onBack }) => {
  const features = [
    {
      icon: <VoiceChat />,
      title: 'Voice Recognition',
      description: 'Say multiple items at once and our AI will automatically separate and categorize them',
      color: '#6366F1',
      tips: [
        'Speak clearly and at normal pace',
        'You can say multiple items in one session',
        'The app will process all items when you stop speaking',
        'Works best in quiet environments',
      ],
    },
    {
      icon: <AutoFixHigh />,
      title: 'Smart Auto-correction',
      description: 'AI automatically detects and suggests corrections for misspelled items',
      color: '#F59E0B',
      tips: [
        'Common misspellings are automatically detected',
        'You can choose to keep original or use corrections',
        'Supports Asian and Indian grocery terms',
        'Learning improves over time',
      ],
    },
    {
      icon: <Category />,
      title: 'Intelligent Categorization',
      description: 'Items are automatically sorted into relevant categories like Produce, Dairy, etc.',
      color: '#10B981',
      tips: [
        'Supports 8+ categories including Asian & Indian Pantry',
        'Click edit icon to manually change categories',
        'AI learns from your preferences',
        '400+ pre-loaded grocery items in database',
      ],
    },
    {
      icon: <DateRange />,
      title: 'Date-based Lists',
      description: 'Each date gets its own separate grocery list for better organization',
      color: '#8B5CF6',
      tips: [
        'Switch between dates using the sidebar',
        'Create lists for future shopping trips',
        'Past lists remain accessible',
        'Easy date picker for quick navigation',
      ],
    },
  ];

  const quickStart = [
    {
      step: 1,
      title: 'Add Items',
      description: 'Use the voice button or type items manually',
      icon: <Mic />,
    },
    {
      step: 2,
      title: 'Review Suggestions',
      description: 'Check auto-corrections and categorization',
      icon: <Edit />,
    },
    {
      step: 3,
      title: 'Shop Smart',
      description: 'Check off items as you shop',
      icon: <CheckCircle />,
    },
  ];

  const voiceCommands = [
    'apples bananas and oranges',
    'milk bread eggs and cheese',
    'basmati rice turmeric and garam masala',
    'chicken breast salmon and ground beef',
    'yogurt ice cream and butter',
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
      {/* Help Page Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={onBack}
            sx={{
              mr: 2,
              borderRadius: '12px',
              '&:hover': {
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
              },
            }}
          >
            <ArrowBack />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" sx={{ color: 'white', fontSize: '1.2rem' }}>
                💡
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Help & Guide
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Learn how to use Grocery Voice List effectively
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Quick Start Section */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Getting Started
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, opacity: 0.9 }}>
              Follow these simple steps to create your first smart grocery list
            </Typography>

            <Grid container spacing={3}>
              {quickStart.map((item) => (
                <Grid item xs={12} md={4} key={item.step}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      p: 3,
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      {React.cloneElement(item.icon, { sx: { fontSize: 28 } })}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {item.step}. {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {item.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>

        {/* Features Section */}
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
          Key Features
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(226, 232, 240, 0.6)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${feature.color} 0%, ${feature.color}CC 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {React.cloneElement(feature.icon, { sx: { fontSize: 24 } })}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {feature.title}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {feature.description}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Tips & Best Practices:
                  </Typography>
                  <List dense>
                    {feature.tips.map((tip, tipIndex) => (
                      <ListItem key={tipIndex} sx={{ pl: 0 }}>
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: feature.color,
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={tip}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { fontSize: '0.875rem' },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Voice Commands Examples */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(226, 232, 240, 0.6)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Voice Command Examples
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try these example phrases with the voice recognition feature:
          </Typography>

          <Grid container spacing={2}>
            {voiceCommands.map((command, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.1)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'primary.dark' }}>
                    "{command}"
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Categories Information */}
        <Paper
          sx={{
            p: 4,
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(226, 232, 240, 0.6)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            Smart Categories
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Items are automatically organized into these categories:
          </Typography>

          <Grid container spacing={2}>
            {[
              { name: 'Produce', color: '#10B981', items: 'Fruits, vegetables, herbs' },
              { name: 'Dairy', color: '#3B82F6', items: 'Milk, cheese, yogurt, eggs' },
              { name: 'Meat & Seafood', color: '#EF4444', items: 'Fresh meat, fish, poultry' },
              { name: 'Asian Pantry', color: '#8B5CF6', items: 'Rice, noodles, sauces, oils' },
              { name: 'Indian Pantry', color: '#F59E0B', items: 'Spices, lentils, flour, ghee' },
              { name: 'Frozen', color: '#06B6D4', items: 'Frozen foods, ice cream' },
              { name: 'Beverages', color: '#84CC16', items: 'Drinks, juices, tea, coffee' },
              { name: 'Snacks', color: '#F97316', items: 'Chips, nuts, sweets' },
              { name: 'Bakery', color: '#EC4899', items: 'Bread, pastries, cakes' },
            ].map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.name}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    background: 'rgba(248, 250, 252, 0.8)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: category.color,
                      }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {category.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {category.items}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

HelpPage.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default HelpPage;