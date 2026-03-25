import React from 'react';
import BarGraph from '../../dashboard/components/BarGraph';
import ResourceFlags from '../../dashboard/components/ResourceFlags';
import HomeMarketingChart from '../../dashboard/components/HomeMarketingChart';
import MissingClassificationsAlert from '../../dashboard/components/MissingClassificationsAlert';

export const ChartRefs = ({ dashboardData, chartBarRef, chartPieRef, chartHomeRef, chartMissingRef }) => {
  if (!dashboardData.overall || !dashboardData.individual || !dashboardData.resourceFlags) {
    return null;
  }

  return (
    <>
      <div ref={chartBarRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
        <BarGraph data={dashboardData.overall} />
      </div>
      <div ref={chartPieRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
        <ResourceFlags data={dashboardData.resourceFlags} />
      </div>
      <div ref={chartHomeRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
        <HomeMarketingChart />
      </div>
      <div ref={chartMissingRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
        <MissingClassificationsAlert data={dashboardData.missingClassifications} />
      </div>
    </>
  );
};

export default ChartRefs;
