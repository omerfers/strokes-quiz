import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  LoadingState,
  MutableDataFrame,
} from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import songsFile from './songs.json';
import { DEFAULT_QUERY, SongRow, SongsFile, StrokesDataSourceOptions, StrokesQuery } from './types';
const CATALOG = (songsFile as SongsFile).songs;
export class DataSource extends DataSourceApi<StrokesQuery, StrokesDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<StrokesDataSourceOptions>) {
    super(instanceSettings);
  }
  getDefaultQuery(_app: CoreApp): Partial<StrokesQuery> {
    return DEFAULT_QUERY;
  }
  async testDatasource() {
    try {
      if (!Array.isArray(CATALOG) || CATALOG.length === 0) {
        return { status: 'error', message: 'Bundled song catalog is empty.' };
      }
      return { status: 'success', message: `Catalog loaded: ${CATALOG.length} songs.` };
    } catch (error) {
      return { status: 'error', message: `Could not read the catalog: ${String(error)}` };
    }
  }
  async query(request: DataQueryRequest<StrokesQuery>): Promise<DataQueryResponse> {
    const targets = request.targets.length > 0 ? request.targets : [{ ...DEFAULT_QUERY, refId: 'A' }];
    try {
      const frames = targets.map((target, i) => this.buildFrame(target, `A${i > 0 ? i : ''}`));
      return { data: frames, state: LoadingState.Done };
    } catch (error) {
      return {
        data: [],
        state: LoadingState.Error,
        error: { message: `Strokes catalog query failed: ${String(error)}` },
      };
    }
  }
  private buildFrame(target: StrokesQuery, refId: string): DataFrame {
    const album = this.interpolate(target.album ?? 'all');
    const limit = this.clampLimit(target.limit);
    const rows = this.filterSongs(album).slice(0, limit);
    const frame = new MutableDataFrame({
      refId: target.refId || refId,
      name: album === 'all' ? 'songs' : album,
      meta: {
        preferredVisualisationType: 'table',
      },
      fields: [
        { name: 'id', type: FieldType.string },
        { name: 'title', type: FieldType.string },
        { name: 'album', type: FieldType.string },
        { name: 'year', type: FieldType.number },
        { name: 'startOffsetSeconds', type: FieldType.number },
      ],
    });
    rows.forEach((song) => frame.add(song));
    return frame;
  }
  private filterSongs(album: string): SongRow[] {
    if (!album || album.toLowerCase() === 'all') {
      return CATALOG;
    }
    const needle = album.toLowerCase();
    return CATALOG.filter((song) => song.album.toLowerCase() === needle);
  }
  private interpolate(value: string): string {
    try {
      return getTemplateSrv().replace(value);
    } catch {
      return value;
    }
  }
  private clampLimit(limit: number | undefined): number {
    if (!Number.isFinite(limit) || !limit || limit <= 0) {
      return DEFAULT_QUERY.limit ?? 50;
    }
    return Math.min(Math.floor(limit), 500);
  }
}
export const ALBUMS: string[] = Array.from(new Set(CATALOG.map((song) => song.album))).sort();
