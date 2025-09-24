import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  Fade,
  IconButton
} from '@mui/material';
import {
  CheckCircle,
  Close,
  Celebration,
  ShoppingCart
} from '@mui/icons-material';

const CongratulationsDialog = ({ open, onClose, itemCount, currentDate }) => {
  const congratsMessages = [
    "🎉 Shopping list complete!",
    "✨ All done! Great job!",
    "🌟 List conquered!",
    "🎊 Mission accomplished!",
    "💪 All items checked off!"
  ];

  const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      PaperProps={{
        sx: {
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #F0FDF4 100%)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
        }
      }}
      TransitionComponent={Fade}
      transitionDuration={400}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 1)',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Close />
      </IconButton>

      <DialogContent sx={{ textAlign: 'center', p: 4, position: 'relative' }}>
        {/* Floating celebration icons */}
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': {
                transform: 'translateX(-50%) translateY(0)',
              },
              '40%': {
                transform: 'translateX(-50%) translateY(-10px)',
              },
              '60%': {
                transform: 'translateX(-50%) translateY(-5px)',
              },
            },
          }}
        >
          <Celebration
            sx={{
              fontSize: 48,
              color: '#F59E0B',
              filter: 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.3))',
            }}
          />
        </Box>

        {/* Main success icon */}
        <Box sx={{ mb: 3, mt: 2 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
                },
                '50%': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 25px 50px rgba(16, 185, 129, 0.4)',
                },
                '100%': {
                  transform: 'scale(1)',
                  boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)',
                },
              },
            }}
          >
            <CheckCircle sx={{ fontSize: 64, color: 'white' }} />
          </Box>
        </Box>

        {/* Congratulations text */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            fontSize: { xs: '1.75rem', sm: '2rem' },
          }}
        >
          {randomMessage}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            mb: 3,
            fontWeight: 500,
          }}
        >
          You've completed all {itemCount} items on your grocery list!
        </Typography>

        {/* Stats box */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '16px',
            p: 2,
            mb: 3,
            border: '1px solid rgba(16, 185, 129, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <ShoppingCart sx={{ color: 'primary.main' }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Shopping Complete
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {currentDate} • {itemCount} items checked off
          </Typography>
        </Box>

        {/* Action button */}
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            borderRadius: '16px',
            px: 4,
            py: 1.5,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            textTransform: 'none',
            fontSize: '1.1rem',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 32px rgba(16, 185, 129, 0.5)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Awesome! 🎉
        </Button>

        {/* Confetti effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: '24px',
          }}
        >
          {[...Array(20)].map((_, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'][i % 5],
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animation: 'confetti 3s infinite linear',
                '@keyframes confetti': {
                  '0%': {
                    transform: 'translateY(-100vh) rotate(0deg)',
                    opacity: 1,
                  },
                  '100%': {
                    transform: 'translateY(100vh) rotate(360deg)',
                    opacity: 0,
                  },
                },
              }}
            />
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

CongratulationsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  itemCount: PropTypes.number.isRequired,
  currentDate: PropTypes.string.isRequired,
};

export default CongratulationsDialog;