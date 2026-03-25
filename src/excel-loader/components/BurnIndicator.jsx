import React from 'react';
import '../styles/BurnIndicator.css';

export const BurnIndicator = ({ row, headers, projectedRate = 100 }) => {
  // Find relevant columns for burn calculation
  const findColumnIndex = (keywords) => 
    headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k)));

  const indices = {
    projectedRate: findColumnIndex(['projected rate($)', 'projected rate']),
    actualRate: findColumnIndex(['actual rate']),
  };

  // Get Projected Rate value (in $)
  const projectedRateValue = indices.projectedRate >= 0 ? parseFloat(row[indices.projectedRate]) || 0 : 0;
  
  // Get Actual Rate value (in $)
  const actualRateValue = indices.actualRate >= 0 ? parseFloat(row[indices.actualRate]) || 0 : 0;
  
  // Calculate burn percentage (Actual Rate / Projected Rate * 100)
  // If projected rate is 0 or missing, show 0%
  const burnPercentage = projectedRateValue > 0 ? (actualRateValue / projectedRateValue) * 100 : 0;
  
  // Determine segments for the bar
  let actualPercent = Math.min(burnPercentage, 100); // Green segment
  let projectedPercent = 0; // Yellow segment
  let overburnPercent = 0; // Red segment
  let statusColor = '#10b981'; // Green by default
  
  if (burnPercentage > 100) {
    actualPercent = 100;
    const excess = burnPercentage - 100;
    if (excess <= 30) {
      projectedPercent = excess;
      statusColor = '#fbbf24'; // Yellow
    } else {
      projectedPercent = 30;
      overburnPercent = excess - 30;
      statusColor = '#ef4444'; // Red
    }
  }

  return (
    <div className="burn-indicator-container">
      <div className="burn-bar-wrapper">
        <div className="burn-bar-background">
          {/* Green segment - Actual */}
          <div 
            className="burn-bar-segment actual-segment"
            style={{ width: `${actualPercent}%` }}
            title={`Actual: ${actualPercent.toFixed(1)}%`}
          />
          {/* Yellow segment - Projected */}
          {projectedPercent > 0 && (
            <div 
              className="burn-bar-segment projected-segment"
              style={{ width: `${projectedPercent}%` }}
              title={`Projected: ${projectedPercent.toFixed(1)}%`}
            />
          )}
          {/* Red segment - Overburn */}
          {overburnPercent > 0 && (
            <div 
              className="burn-bar-segment overburn-segment"
              style={{ width: `${overburnPercent}%` }}
              title={`Overburn: ${overburnPercent.toFixed(1)}%`}
            />
          )}
        </div>
      </div>
      <span className="burn-percentage-text" style={{ color: statusColor }}>
        {burnPercentage.toFixed(1)}%
      </span>
    </div>
  );
};

export default BurnIndicator;
