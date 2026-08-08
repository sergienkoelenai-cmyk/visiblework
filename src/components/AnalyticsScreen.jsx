import React from 'react';
import AnalyticsPage from './AnalyticsPage';

/**
 * AnalyticsScreen component — Pure Analytics & Category Cost Management.
 * Re-exports AnalyticsPage to satisfy exact deliverable name specifications.
 */
export default function AnalyticsScreen(props) {
  return <AnalyticsPage {...props} />;
}

export { AnalyticsScreen };
