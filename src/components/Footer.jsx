import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 3,
        textAlign: 'center',
        borderTop: '1px solid rgba(226, 232, 240, 0.8)',
        backgroundColor: 'transparent',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © 2025 Grocery List App. Built by{' '}
        <Link
          href="https://github.com/surajfale"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.main',
            textDecoration: 'none',
            fontWeight: 500,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          Suraj
        </Link>
        {' '}with React + Material UI.
      </Typography>
    </Box>
  );
};

export default Footer;