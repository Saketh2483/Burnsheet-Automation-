import React from 'react';
import CombinedDashboard from '../../dashboard/components/CombinedDashboard';

export const DashboardView = ({ dashboardData, onNavigateBack, onExportExcel, onExportPDF }) => {
  return (
    <div style={{ background: '#f0f2f5', minHeight: '70vh', overflowY: 'auto' }}>
      {dashboardData.loading && <div style={{ textAlign: 'center', padding: 60, fontSize: 20 }}>⏳ Loading Dashboard...</div>}
      {dashboardData.error && <div style={{ textAlign: 'center', padding: 40, color: 'red' }}>❌ {dashboardData.error}</div>}
      {dashboardData.overall && dashboardData.individual && dashboardData.resourceFlags && (
        <CombinedDashboard
          overallData={dashboardData.overall}
          individualData={dashboardData.individual}
          resourceFlagsData={dashboardData.resourceFlags}
          onNavigateBack={onNavigateBack}
          onExportExcel={onExportExcel}
          onExportPDF={onExportPDF}
        />
      )}
    </div>
  );
};

export default DashboardView;
