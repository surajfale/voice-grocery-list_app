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
            role="note"
            className={`relative w-full bg-muted border-b border-border overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="flex items-center justify-center gap-2 py-2 pl-4 pr-10 text-center">
                <Info className="size-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Learning project.</span> Availability isn&apos;t guaranteed and data may be reset.
                </p>
                <button
                    type="button"
                    aria-label="Dismiss notice"
                    onClick={handleClose}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
                >
                    <X className="size-3.5" />
                </button>
            </div>
        </div>
    );
};

export default ProjectDisclaimer;
