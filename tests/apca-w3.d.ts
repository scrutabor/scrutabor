// apca-w3 ships no types (0.1.9); this declares exactly the two functions
// the contrast gate uses, typed to how it calls them.
declare module 'apca-w3' {
	export function sRGBtoY(rgb: [number, number, number] | number[]): number;
	export function APCAcontrast(textY: number, backgroundY: number): number | string;
}
