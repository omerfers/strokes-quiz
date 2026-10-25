import React from 'react';
import { Alert } from '@grafana/ui';

/**
 * Nothing to configure: the catalog is bundled with the plugin, which keeps the
 * demo working without an external API. Swap in a REST call here if you want to
 * make the data source configurable later.
 */
export function ConfigEditor() {
  return (
    <Alert title="Strokes Song Catalog" severity="info">
      This data source needs no configuration. It serves the bundled Strokes catalog (title, album, year and
      per-song intro offset) as a table so panels can query it.
    </Alert>
  );
}
