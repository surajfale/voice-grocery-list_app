import React, { useId } from 'react';
import PropTypes from 'prop-types';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const MESSAGES = {
  short: 'This app is built for learning and personal use. It isn’t a public service and isn’t intended for children.',
  full: 'This app is built for learning and personal use only. It isn’t a public service, isn’t intended for anyone else to use, and isn’t intended for children. There’s no guarantee of availability or that data will be kept, so please don’t store anything sensitive or important.',
};

/**
 * "Personal learning project" notice for the auth screens. Purely
 * informational: it collects nothing about the visitor.
 */
const PersonalUseNotice = ({ variant = 'short', className = '' }) => {
  const headingId = useId();
  return (
    <Alert variant="info" role="note" aria-labelledby={headingId} className={className}>
      <Info />
      <h2 id={headingId} className="col-start-2 font-semibold text-sm leading-tight">Personal learning project</h2>
      <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
        {MESSAGES[variant]}
      </AlertDescription>
    </Alert>
  );
};

PersonalUseNotice.propTypes = {
  variant: PropTypes.oneOf(['short', 'full']),
  className: PropTypes.string,
};

export default PersonalUseNotice;
