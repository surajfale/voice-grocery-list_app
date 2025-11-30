import React, { useState, useEffect } from 'react';
import { Alert, Box, IconButton, Collapse, Typography } from '@mui/material';
import { Close, Info } from '@mui/icons-material';

const ProjectDisclaimer = () => {
    const [open, setOpen] = useState(true);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Check if user has already dismissed the disclaimer
        const dismissed = localStorage.getItem('project_disclaimer_dismissed');
        if (!dismissed) {
            setVisible(true);
        }
    }, []);

    const handleClose = () => {
        setOpen(false);
        // Wait for animation to finish before hiding completely
        setTimeout(() => {
            setVisible(false);
            localStorage.setItem('project_disclaimer_dismissed', 'true');
        }, 300);
    };

    if (!visible) { return null; }

    return (
        <Box sx={{ width: '100%', position: 'relative', zIndex: 2000 }}>
            <Collapse in={open}>
                <Alert
                    severity="info"
                    icon={<Info fontSize="inherit" />}
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={handleClose}
                        >
                            <Close fontSize="inherit" />
                        </IconButton>
                    }
                    sx={{
                        borderRadius: 0,
                        '& .MuiAlert-message': {
                            width: '100%',
                            textAlign: 'center',
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        <strong>Learning Project:</strong> This is a personal study project. Service availability is not guaranteed and data may be periodically reset.
                    </Typography>
                </Alert>
            </Collapse>
        </Box>
    );
};

export default ProjectDisclaimer;
