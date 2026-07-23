import type { FacehashProjection } from "../core";

function toFixedNumber(value: number): number {
	return Number(value.toFixed(3));
}

export function sceneUnitToPixels(value: number, size: number): number {
	return toFixedNumber((value / 100) * size);
}

export function toSatoriProjectionTransform(
	projection: FacehashProjection,
	size: number
): string {
	const translateX = sceneUnitToPixels(projection.translateX, size);
	const translateY = sceneUnitToPixels(projection.translateY, size);

	return [
		`translate(${translateX}px, ${translateY}px)`,
		`skew(${toFixedNumber(projection.skewX)}deg, ${toFixedNumber(
			projection.skewY
		)}deg)`,
		`scale(${toFixedNumber(projection.scaleX)}, ${toFixedNumber(
			projection.scaleY
		)})`,
	].join(" ");
}
