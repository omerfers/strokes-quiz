import React, { ChangeEvent } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField, Input, Select, Stack } from '@grafana/ui';
import { ALBUMS, DataSource } from '../datasource';
import { StrokesDataSourceOptions, StrokesQuery } from '../types';
type Props = QueryEditorProps<DataSource, StrokesQuery, StrokesDataSourceOptions>;
const ALBUM_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'All albums', value: 'all' },
  ...ALBUMS.map((album) => ({ label: album, value: album })),
];
export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onAlbumChange = (value: SelectableValue<string>) => {
    onChange({ ...query, album: value.value ?? 'all' });
    onRunQuery();
  };
  const onLimitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(event.currentTarget.value, 10);
    onChange({ ...query, limit: Number.isFinite(parsed) ? parsed : undefined });
    onRunQuery();
  };
  return (
    <Stack gap={1} direction="row" wrap="wrap">
      <InlineField label="Album" labelWidth={12} tooltip="Filter the catalog by album">
        <Select
          inputId="strokes-album"
          width={26}
          options={ALBUM_OPTIONS}
          value={query.album ?? 'all'}
          onChange={onAlbumChange}
          isSearchable
        />
      </InlineField>
      <InlineField label="Limit" labelWidth={10} tooltip="Maximum rows returned (1-500)">
        <Input
          id="strokes-limit"
          width={8}
          type="number"
          min={1}
          max={500}
          value={query.limit ?? 50}
          onChange={onLimitChange}
        />
      </InlineField>
    </Stack>
  );
}
