import farm1 from './farm1.json';
/** Levels in play order. pond/ditches point at the placeholder until their own files land. */
export const LEVEL_ORDER = ['pond', 'ditches'];
export const RAW_LEVELS: Record<string, unknown> = { pond: farm1, ditches: farm1 };
