// The rule table of the pronunciation page, lifted out of the component so a
// test can read it. The page teaches these rules and prints a transcription
// beside each; `pronuntiatio.test.ts` holds those transcriptions to what
// `pronunciation.ts` actually generates, and the deep links to the corpus
// words they name.
export interface PronunciationRule {
	grapheme: string;
	roman: string;
	polish: string;
	example: string;
	exampleIpa: Record<'pl' | 'en', string>;
	href?: string;
}

export const PRONUNCIATION_RULES: PronunciationRule[] = [
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
		exampleIpa: { pl: 'rz. /aˈʃɛn.dit/ · pol. /aˈstsɛn.dit/', en: '/aˈʃɛn.dit/' }
	},
	{
		grapheme: 'ti + vocalis',
		roman: '/tsi/',
		polish: '/tsi/',
		example: 'grátia',
		exampleIpa: { pl: '/ˈgra.tsi.a/', en: '/ˈgra.tsi.a/' },
		href: '/orationes/ave-maria?w=w003'
	},
	{
		grapheme: 'h',
		roman: '—',
		polish: '/x/',
		example: 'hódie',
		exampleIpa: { pl: 'rz. /ˈɔ.di.ɛ/ · pol. /ˈxɔ.di.ɛ/', en: '/ˈɔ.di.ɛ/' },
		href: '/orationes/pater-noster?w=w027'
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
		grapheme: 'i + vocalis',
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
		exampleIpa: { pl: 'rz. /ˈa.ɲus/ · pol. /ˈa.gnus/', en: '/ˈa.ɲus/' }
	},
	{
		grapheme: 'xc + e, i, æ, œ, y',
		roman: '/kʃ/',
		polish: '/ksts/',
		example: 'excélsis',
		exampleIpa: { pl: 'rz. /ɛkˈʃɛl.sis/ · pol. /ɛksˈtsɛl.sis/', en: '/ɛkˈʃɛl.sis/' }
	},
	{
		grapheme: 's (inter vocales)',
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
		example: 'Lázare',
		exampleIpa: { pl: 'rz. /ˈla.dza.rɛ/ · pol. /ˈla.za.rɛ/', en: '/ˈla.dza.rɛ/' }
	}
];
