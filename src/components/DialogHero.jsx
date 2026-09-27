import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { DialogTitle, DialogDescription, DialogClose } from './ui/dialog';

/**
 * Gradient header band for dialogs: icon tile, title, description and a
 * close button that stays readable on the gradient. Use with
 * `<DialogContent showCloseButton={false} className="p-0 gap-0 overflow-hidden">`.
 */
const DialogHero = ({ icon: Icon, title, description = null, tone = 'accent', showClose = true, children = null }) => (
  <div
    className={`hero-gradient px-6 pt-6 pb-5 ${tone === 'danger' ? 'hero-danger' : ''}`}
    style={{ boxShadow: 'none' }}
  >
    <div className="relative z-10">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="size-11 rounded-2xl flex items-center justify-center shrink-0 bg-[color-mix(in_oklch,currentColor_16%,transparent)]">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm mt-0.5 opacity-85 text-inherit">{description}</DialogDescription>
          )}
        </div>
        {showClose && (
          <DialogClose
            aria-label="Close"
            className="size-9 shrink-0 rounded-xl flex items-center justify-center border border-[color-mix(in_oklch,currentColor_25%,transparent)] bg-[color-mix(in_oklch,currentColor_12%,transparent)] hover:bg-[color-mix(in_oklch,currentColor_22%,transparent)] transition-colors"
          >
            <X className="size-4" />
          </DialogClose>
        )}
      </div>
      {children}
    </div>
  </div>
);

DialogHero.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  tone: PropTypes.oneOf(['accent', 'danger']),
  showClose: PropTypes.bool,
  children: PropTypes.node,
};

export default DialogHero;
