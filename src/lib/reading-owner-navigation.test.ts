import { expect, it } from 'vitest';
import { readingIntroductionOwners, introductionLookup } from './introductiones';
import { everyTextInOrder } from './concordance';
import { hasText } from './corpus';

// Literal role/order expectations, independently read from the declared canonical bindings.
const expected = {
	epistola: [
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-romanos',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-philippenses',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-corinthios',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-titum',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-hebraeos',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-galatas',
		'ordinarium/lectio-actuum-apostolorum',
		'ordinarium/lectio-isaiae-prophetae',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-colossenses',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-thessalonicenses',
		'ordinarium/lectio-epistolae-beati-pauli-apostoli-ad-ephesios',
		'ordinarium/lectio-epistolae-beati-ioannis-apostoli',
		'ordinarium/lectio-epistolae-beati-petri-apostoli',
		'ordinarium/lectio-epistolae-beati-iacobi-apostoli',
		'ordinarium/lectio-libri-sapientiae',
		'ordinarium/lectio-libri-iudith',
		'ordinarium/lectio-ezechielis-prophetae',
		'ordinarium/lectio-libri-apocalypsis-beati-ioannis-apostoli',
		'ordinarium/lectio-libri-machabaeorum',
		'ordinarium/lectio-malachiae-prophetae'
	],
	evangelium: [
		'ordinarium/sequentia-sancti-evangelii-secundum-lucam',
		'ordinarium/sequentia-sancti-evangelii-secundum-matthaeum',
		'ordinarium/sequentia-sancti-evangelii-secundum-ioannem',
		'ordinarium/evangelium-ultimum',
		'ordinarium/passio-domini-nostri-iesu-christi-secundum-matthaeum',
		'ordinarium/sequentia-sancti-evangelii-secundum-marcum',
		'ordinarium/initium-sancti-evangelii-secundum-matthaeum'
	]
} as const;

it.each(['epistola', 'evangelium'] as const)(
	'%s sequences every exact declared heading owner and rejects a missing binding',
	(role) => {
		expect(readingIntroductionOwners(role)).toEqual(expected[role]);
		for (const key of expected[role]) expect(hasText(key), key).toBe(true);
		const original = introductionLookup!;
		const broken = { ...original, announcements: new Map(original.announcements) };
		const key =
			role === 'epistola'
				? 'proprium/dominica-iii-post-pascha-epistola'
				: 'proprium/dominica-iii-post-pascha-evangelium';
		expect(broken.announcements.delete(key)).toBe(true);
		expect(() => readingIntroductionOwners(role, broken)).toThrow(
			/reading introduction owner unavailable/
		);
		expect(readingIntroductionOwners(role)).toEqual(expected[role]);
	}
);

it('sequences the twenty-six standalone owners at their reading slots without moving the full Last Gospel', () => {
	const order = everyTextInOrder();
	const gospel = expected.evangelium.filter((key) => key !== 'ordinarium/evangelium-ultimum');
	for (const key of [...expected.epistola, ...gospel])
		expect(order.filter((item) => item === key)).toHaveLength(1);
	expect([...expected.epistola, ...gospel]).toHaveLength(26);
	const epistleStart = order.indexOf(expected.epistola[0]);
	expect(order.slice(epistleStart, epistleStart + 20)).toEqual(expected.epistola);
	expect(epistleStart).toBeGreaterThan(order.indexOf('ordinarium/aufer-a-nobis'));
	expect(epistleStart + 20).toBe(order.indexOf('ordinarium/deo-gratias-epistolae'));
	const gospelStart = order.indexOf(gospel[0]);
	expect(order.slice(gospelStart, gospelStart + 6)).toEqual(gospel);
	expect(gospelStart).toBeGreaterThan(
		order.indexOf('ordinarium/iube-domne-benedicere-in-passione')
	);
	expect(gospelStart + 6).toBe(order.indexOf('ordinarium/laus-tibi-christe'));
	expect(order.indexOf('ordinarium/evangelium-ultimum')).toBeGreaterThan(
		order.indexOf('ordinarium/placeat-tibi')
	);
	expect(order.filter((key) => key === 'ordinarium/evangelium-ultimum')).toHaveLength(1);
});
