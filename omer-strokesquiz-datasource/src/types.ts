import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface StrokesQuery extends DataQuery {
  /** Album to filter by, or 'all'. */
  album?: string;
  /** Maximum number of rows to return. */
  limit?: number;
}

export const DEFAULT_QUERY: Partial<StrokesQuery> = {
  album: 'all',
  limit: 50,
};

export interface StrokesDataSourceOptions extends DataSourceJsonData {
  // Nothing to configure: the catalog ships with the plugin.
}

export interface SongRow {
  id: string;
  title: string;
  album: string;
  albumKey: string;
  year: number;
  startOffsetSeconds: number;
}

export interface SongsFile {
  generatedBy: string;
  songs: SongRow[];
}
