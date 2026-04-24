import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`APPROD - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="Monitoreo operativo de backups APPROD (D, E, F, G, H, I) con AWS DataSync"
      />
      <meta name="keywords" content="approd,backup,datasync,aws,monitoring" />

      <OverviewAnalyticsView moduleFilter="APPROD" />
    </>
  );
}
