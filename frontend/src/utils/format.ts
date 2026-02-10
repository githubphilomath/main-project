/**
 * Formatting utilities
 */

import { formatDistanceToNow } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatPhaseName = (phase: string): string => {
  return phase
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

