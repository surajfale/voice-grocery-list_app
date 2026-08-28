import React, { memo } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Edit } from '@mui/icons-material';

const CorrectionDialog = memo(({
  open,
  corrections,
  onAccept,
  onReject,
  onClose
}) => {
  const theme = useTheme();
  const { palette } = theme;

  if (!open || corrections.length === 0) {return null;}

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      keepMounted={false}
      aria-labelledby="correction-dialog-title"
      aria-describedby="correction-dialog-description"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '24px',
        },
      }}
    >
      <DialogTitle
        id="correction-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 1,
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            backgroundColor: palette.warning.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(palette.warning.main, 0.3)}`,
          }}
        >
          <Edit sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Smart Auto-corrections
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {corrections.length} item{corrections.length > 1 ? 's' : ''} found
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography
          id="correction-dialog-description"
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '12px',
            backgroundColor: alpha(palette.primary.main, 0.05),
            border: `1px solid ${alpha(palette.primary.main, 0.1)}`,
          }}
        >
          💡 We detected some items that might have spelling mistakes or could be auto-corrected.
          Review the suggestions below and choose your preferred option.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {corrections.map((correction, index) => (
            <Card
              key={index}
              sx={{
                borderRadius: '16px',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: alpha(palette.primary.main, 0.2),
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: alpha(palette.primary.main, 0.1),
                      color: 'primary.main',
                      px: 1,
                      py: 0.5,
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  >
                    #{index + 1}
                  </Typography>
                  <Chip
                    label={correction.category}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: palette.primary.main,
                      color: 'white',
                      border: 'none',
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Original Text */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                      Original
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '8px',
                        backgroundColor: alpha(palette.error.main, 0.1),
                        border: `1px solid ${alpha(palette.error.main, 0.2)}`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'error.dark',
                          textDecoration: 'line-through',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                      >
                        "{correction.original}"
                      </Typography>
                    </Box>
                  </Box>

                  {/* Arrow */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>
                      →
                    </Typography>
                  </Box>

                  {/* Corrected Text */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mb: 0.5, display: 'block' }}>
                      Suggested
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '8px',
                        backgroundColor: alpha(palette.success.main, 0.1),
                        border: `1px solid ${alpha(palette.success.main, 0.2)}`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'success.dark',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        "{correction.corrected}"
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          onClick={onReject}
          variant="outlined"
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1,
            borderColor: alpha(palette.error.main, 0.3),
            color: 'error.main',
            '&:hover': {
              borderColor: 'error.main',
              backgroundColor: alpha(palette.error.main, 0.04),
            },
          }}
        >
          Keep Original
        </Button>
        <Button
          onClick={onAccept}
          variant="contained"
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1,
            backgroundColor: palette.success.main,
            boxShadow: `0 4px 12px ${alpha(palette.success.main, 0.3)}`,
            '&:hover': {
              backgroundColor: palette.success.dark,
              boxShadow: `0 6px 16px ${alpha(palette.success.main, 0.4)}`,
            },
          }}
        >
          Apply Corrections
        </Button>
      </DialogActions>
    </Dialog>
  );
});

CorrectionDialog.displayName = 'CorrectionDialog';

// PropTypes validation
CorrectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  corrections: PropTypes.array.isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired
};

// onClose is optional (dialog can be controlled externally)
CorrectionDialog.propTypes.onClose = PropTypes.func;

export default CorrectionDialog;
