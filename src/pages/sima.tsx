import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`SIMA - ${CONFIG.appName}`}</title>
      <meta name="description" content="Monitoreo operativo del backup SIMA con AWS DataSync" />
      <meta name="keywords" content="sima,backup,datasync,aws,monitoring" />

      <OverviewAnalyticsView moduleFilter="SIMA" />
    </>
  );
}
