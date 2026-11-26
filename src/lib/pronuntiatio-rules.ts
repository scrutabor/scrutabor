// The rule table of the pronunciation page, lifted out of the component so a
// test can read it. The page teaches these rules and prints a transcription
// beside each; `pronuntiatio.test.ts` holds those transcriptions to what
// `pronunciation.ts` actually generates, and the deep links to the corpus
// words they name.
import { bindPlFields } from './polish';

export interface PronunciationRule {
	grapheme: string;
	label?: Record<'pl' | 'en', string>;
	roman: string | null;
	polish: string;
	example: string;
	exampleIpa: Record<'pl' | 'en', string>;
	href?: string;
}

export const PRONUNCIATION_RULES = bindPlFields<PronunciationRule[]>([
	{
		grapheme: 'c + e, i, æ, œ, y',
		roman: '/tʃ/',
		polish: '/ts/',
		example: 'cælis',
		exampleIpa: { pl: 'rz. /ˈtʃɛ.lis/ · pol. /ˈtsɛ.lis/', en: '/ˈtʃɛ.lis/' },
		href: '/orationes/pater-noster?w=w006'
	},
	{
		grapheme: 'g + e, i, æ, œ, y',
		roman: '/dʒ/',
		polish: '/g/',
		example: 'cogitatióne',
		exampleIpa: {
			pl: 'rz. /kɔ.dʒi.ta.tsiˈɔ.nɛ/ · pol. /kɔ.gi.ta.tsiˈɔ.nɛ/',
			en: '/kɔ.dʒi.ta.tsiˈɔ.nɛ/'
		},
		href: '/ordinarium/confiteor?w=w027'
	},
	{
		grapheme: 'sc + e, i, æ, œ, y',
		roman: '/ʃ/',
		polish: '/sts/',
		example: 'ascéndit',
		exampleIpa: { pl: 'rz. /aˈʃɛn.dit/ · pol. /aˈstsɛn.dit/', en: '/aˈʃɛn.dit/' },
		href: '/ordinarium/credo?w=w094'
	},
	{
		grapheme: 'ti',
		label: { pl: 'ti przed samogłoską', en: 'ti before a vowel' },
		roman: '/tsi/',
		polish: '/tsi/',
		example: 'grátia',
		exampleIpa: { pl: '/ˈgra.tsi.a/', en: '/ˈgra.tsi.a/' },
		href: '/orationes/ave-maria?w=w003'
	},
	{
		grapheme: 'h',
		roman: null,
		polish: '/x/',
		example: 'hódie',
		exampleIpa: { pl: 'rz. /ˈɔ.di.ɛ/ · pol. /ˈxɔ.di.ɛ/', en: '/ˈɔ.di.ɛ/' },
		href: '/orationes/pater-noster?w=w027'
	},
	{
		grapheme: 'ch',
		roman: '/k/',
		polish: '/x/',
		example: 'Christe',
		exampleIpa: { pl: 'rz. /ˈkri.stɛ/ · pol. /ˈxri.stɛ/', en: '/ˈkri.stɛ/' },
		href: '/ordinarium/kyrie?w=w007'
	},
	{
		grapheme: 'qu',
		roman: '/kw/',
		polish: '/kv/',
		example: 'qui',
		exampleIpa: { pl: 'rz. /kwi/ · pol. /kvi/', en: '/kwi/' },
		href: '/orationes/pater-noster?w=w003'
	},
	{
		grapheme: 'i',
		label: { pl: 'spółgłoskowe i przed samogłoską', en: 'consonantal i before a vowel' },
		roman: '/j/',
		polish: '/j/',
		example: 'Iesus',
		exampleIpa: { pl: '/ˈjɛ.zus/', en: '/ˈjɛ.zus/' },
		href: '/orationes/ave-maria?w=w016'
	},
	{
		grapheme: 'gn',
		roman: '/ɲ/',
		polish: '/gn/',
		example: 'Agnus',
		exampleIpa: { pl: 'rz. /ˈa.ɲus/ · pol. /ˈa.gnus/', en: '/ˈa.ɲus/' },
		href: '/ordinarium/agnus-dei?w=w001'
	},
	{
		grapheme: 'xc + e, i, æ, œ, y',
		roman: '/kʃ/',
		polish: '/ksts/',
		example: 'excélsis',
		exampleIpa: { pl: 'rz. /ɛkˈʃɛl.sis/ · pol. /ɛksˈtsɛl.sis/', en: '/ɛkˈʃɛl.sis/' },
		href: '/ordinarium/gloria?w=w003'
	},
	{
		grapheme: 's',
		label: { pl: 's między samogłoskami', en: 's between vowels' },
		roman: '/z/',
		polish: '/z/',
		example: 'Iesus',
		exampleIpa: { pl: '/ˈjɛ.zus/', en: '/ˈjɛ.zus/' },
		href: '/orationes/ave-maria?w=w016'
	},
	{
		grapheme: 'æ, œ',
		roman: '/ɛ/',
		polish: '/ɛ/',
		example: 'sǽcula',
		exampleIpa: { pl: '/ˈsɛ.ku.la/', en: '/ˈsɛ.ku.la/' },
		href: '/orationes/gloria-patri?w=w018'
	},
	{
		grapheme: 'z',
		roman: '/dz/',
		polish: '/z/',
		example: 'zelátor',
		exampleIpa: { pl: 'rz. /dzɛˈla.tɔr/ · pol. /zɛˈla.tɔr/', en: '/dzɛˈla.tɔr/' },
		href: '/litaniae/sanctissimi-nominis-iesu?w=w139'
	}
]);
