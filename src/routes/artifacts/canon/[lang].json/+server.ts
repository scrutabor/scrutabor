import { canonData } from '$lib/loaders';
import { languageArtifact, languageArtifactEntries } from '$lib/artifact-response';
import type { EntryGenerator, RequestHandler } from './$types';
export const prerender = true;
export const entries: EntryGenerator = languageArtifactEntries;
export const GET: RequestHandler = languageArtifact(canonData);
