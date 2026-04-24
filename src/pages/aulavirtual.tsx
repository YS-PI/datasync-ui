import { CONFIG } from 'src/config-global';

import { OverviewAnalyticsView } from 'src/sections/overview/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Aula Virtual - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="Monitoreo operativo del backup Aula Virtual con AWS DataSync"
      />
      <meta name="keywords" content="aulavirtual,aula virtual,backup,datasync,aws,monitoring" />

      <OverviewAnalyticsView moduleFilter="AULAVIRTUAL" />
    </>
  );
}
