import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`GLPI - ${CONFIG.appName}`}</title>
      <meta name="description" content="Monitoreo operativo del backup GLPI con AWS DataSync" />
      <meta name="keywords" content="glpi,backup,datasync,aws,monitoring" />

      <OverviewAnalyticsView moduleFilter="GLPI" />
    </>
  );
}
