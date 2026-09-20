import React, { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

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
        <div
            className={`relative z-50 w-full bg-primary/10 border-b border-primary/20 overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="flex items-center justify-center gap-2 py-2.5 px-10 relative text-center">
                <Info className="size-4 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">
                    <strong>Learning Project:</strong> This is a personal study project. Service availability is not guaranteed and data may be periodically reset.
                </p>
                <button
                    type="button"
                    aria-label="close"
                    onClick={handleClose}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-primary/15 text-muted-foreground"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
};

export default ProjectDisclaimer;
