import React from 'react';
import PropTypes from 'prop-types';
import { CircleCheck, Circle } from 'lucide-react';
import { validatePassword } from '../utils/passwordValidator';

/**
 * Password Requirements Component
 * Displays password requirements and validates in real-time
 */
const PasswordRequirements = ({ password, showStrength = true }) => {
  const validation = validatePassword(password || '');
  const { requirements, strength } = validation;

  return (
    <div className="mt-3 mb-3">
      {/* Password Strength Meter */}
      {showStrength && password && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Password Strength:
            </span>
            <span
              className="text-xs font-bold uppercase"
              style={{ color: strength.color }}
            >
              {strength.level}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${strength.percentage}%`, backgroundColor: strength.color }}
            />
          </div>
        </div>
      )}

      {/* Requirements List */}
      <p className="text-xs font-semibold text-muted-foreground mb-1.5">
        Password must contain:
      </p>
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center gap-2">
            {req.met ? (
              <CircleCheck className="size-4 text-success shrink-0" />
            ) : (
              <Circle className="size-4 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={`text-xs ${req.met ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
            >
              {req.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

PasswordRequirements.propTypes = {
  password: PropTypes.string,
  showStrength: PropTypes.bool,
};

export default PasswordRequirements;
