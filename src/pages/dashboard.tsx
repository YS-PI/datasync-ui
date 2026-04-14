import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView as DashboardView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Dashboard - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="Panel operativo para monitorear ejecuciones de AWS DataSync desde Lambda y API Gateway"
      />
      <meta name="keywords" content="datasync,aws,lambda,monitoring,dashboard,operations" />

      <DashboardView />
    </>
  );
}
