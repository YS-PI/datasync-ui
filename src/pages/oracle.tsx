import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Oracle - ${CONFIG.appName}`}</title>
      <meta name="description" content="Monitoreo operativo del backup Oracle con AWS DataSync" />
      <meta name="keywords" content="oracle,backup,datasync,aws,monitoring" />

      <OverviewAnalyticsView moduleFilter="ORACLE" />
    </>
  );
}
