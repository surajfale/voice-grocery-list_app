import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const StatusAlerts = memo(({
  isListening,
  transcript,
  skippedDuplicates,
  error = '',
  onClearError = null
}) => {
  return (
    <>
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4 pr-10">
          <AlertDescription>{error}</AlertDescription>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              aria-label="Dismiss"
              className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </Alert>
      )}

      {/* Voice Recognition Status */}
      {isListening && (
        <Alert variant="info" className="mb-4">
          <div className="flex items-center gap-2 col-start-2">
            <span className="size-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium">Listening… say your grocery items</span>
          </div>
        </Alert>
      )}

      {/* Last Transcript */}
      {transcript && (
        <Alert className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertDescription>
            <span className="text-muted-foreground mr-1">Heard:</span>
            <span className="italic">&ldquo;{transcript}&rdquo;</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Skipped Duplicates */}
      {skippedDuplicates.length > 0 && (
        <Alert className="mb-4">
          <AlertDescription>
            Already on your list: {skippedDuplicates.join(', ')}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
});

StatusAlerts.displayName = 'StatusAlerts';

// PropTypes validation
StatusAlerts.propTypes = {
  isListening: PropTypes.bool.isRequired,
  transcript: PropTypes.string.isRequired,
  skippedDuplicates: PropTypes.array.isRequired,
  error: PropTypes.string,
  onClearError: PropTypes.func
};

export default StatusAlerts;
