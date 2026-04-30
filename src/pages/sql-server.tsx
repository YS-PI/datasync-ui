import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`SQL SERVER - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="Monitoreo operativo del backup SQL SERVER con AWS DataSync"
      />
      <meta name="keywords" content="sql server,backup,datasync,aws,monitoring" />

      <OverviewAnalyticsView moduleFilter="SQLSERVER" />
    </>
  );
}
