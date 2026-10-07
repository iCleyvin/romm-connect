// by Cleyvin

import React from 'react';
import { describeError } from '../../api';
import EmptyState from './EmptyState';

interface Props {
  error: unknown;
  onRetry: () => void;
}

const ErrorState = ({ error, onRetry }: Props) => (
  <EmptyState
    icon="cloud-alert"
    title="Couldn't load this"
    subtitle={describeError(error)}
    action={{ label: 'Try again', onPress: onRetry }}
  />
);

export default ErrorState;
