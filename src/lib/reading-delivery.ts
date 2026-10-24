/** Reading delivery is checked before publication and again before inline assembly. */
import type { TextDocument } from './corpus';
import type { IntroductionLookup } from './introduction-contract';

/** Pure: only the supplied document and already validated resource are read.
 * Type-only imports keep this module independent of the client, calendar and proper store. */
export function validateReadingDelivery(
	role: string,
	key: string,
	doc: TextDocument,
	lookup: IntroductionLookup | null
): void {
	if (role !== 'epistola' && role !== 'evangelium') return;
	if (!lookup) throw new Error('introduction resource unavailable');
	if (doc.id !== key.replace('/', '.')) throw new Error('reading owner identity differs');
	const binding = lookup.announcements.get(key);
	if (!binding) throw new Error(`reading ${key} has no announcement`);
	const unit = lookup.units.get(binding.unit);
	if (!unit || (unit.id.startsWith('lectio-') ? 'epistola' : 'evangelium') !== role)
		throw new Error('announcement names a different reading role');
	const passion = lookup.passion.units.includes(binding.unit);
	const verses = doc.segments.filter((s) => s.type === 'verse');
	if (!verses.length) throw new Error('announced reading has no verses');
	const parts = new Set(['chronista', 'christus', 'synagoga']);
	const sungParts = verses.some((s) => parts.has(s.delivery?.cantu?.speaker ?? ''));
	if (
		sungParts !== passion ||
		verses.some(
			(s) =>
				s.speaker !== 'sacerdos' ||
				s.voice !== 'clara' ||
				(s.delivery?.cantu?.voice ?? s.voice) !== (role === 'epistola' ? 'clara' : 'cantus') ||
				(passion
					? !parts.has(s.delivery?.cantu?.speaker ?? s.speaker ?? '')
					: (s.delivery?.cantu?.speaker ?? s.speaker) !== 'sacerdos')
		)
	)
		throw new Error('announcement and reading delivery differ');
}
