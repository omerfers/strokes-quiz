import React from 'react';
import { Alert } from '@grafana/ui';
export function ConfigEditor() {
  return (
    <Alert title="Strokes Song Catalog" severity="info">
      This data source needs no configuration. It serves the bundled Strokes catalog (title, album, year and per-song
      intro offset) as a table so panels can query it.
    </Alert>
  );
}
