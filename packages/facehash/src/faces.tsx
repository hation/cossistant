import type * as React from "react";
import { ensureBlinkKeyframes, getBlinkStyle } from "./blink";
import {
	FACE_GEOMETRIES,
	type FaceGeometry,
	type FacehashBlinkTimings,
	type FaceType,
} from "./core";

export type FaceProps = {
	className?: string;
	style?: React.CSSProperties;
	/**
	 * Enable blinking animation
	 */
	enableBlink?: boolean;
	/**
	 * Blink animation timings for left and right eyes
	 */
	blinkTimings?: FacehashBlinkTimings;
};

type FaceGeometrySvgProps = FaceProps & {
	geometry: FaceGeometry;
};

function FaceGeometrySvg({
	className,
	style,
	enableBlink,
	blinkTimings,
	geometry,
}: FaceGeometrySvgProps) {
	if (enableBlink) {
		ensureBlinkKeyframes();
	}

	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			style={style}
			viewBox={`0 0 ${geometry.viewBox.width} ${geometry.viewBox.height}`}
			xmlns="http://www.w3.org/2000/svg"
		>
			<g style={getBlinkStyle(enableBlink, blinkTimings?.left)}>
				{geometry.leftEyePaths.map((path) => (
					<path d={path} fill="currentColor" key={path} />
				))}
			</g>
			<g style={getBlinkStyle(enableBlink, blinkTimings?.right)}>
				{geometry.rightEyePaths.map((path) => (
					<path d={path} fill="currentColor" key={path} />
				))}
			</g>
		</svg>
	);
}

function createFaceComponent(faceType: FaceType): React.FC<FaceProps> {
	const geometry = FACE_GEOMETRIES[faceType];

	return function FaceVariantComponent(props: FaceProps) {
		return <FaceGeometrySvg geometry={geometry} {...props} />;
	};
}

/**
 * Round eyes face - simple circular eyes
 */
export const RoundFace = createFaceComponent("round");

/**
 * Cross eyes face - X-shaped eyes
 */
export const CrossFace = createFaceComponent("cross");

/**
 * Line eyes face - horizontal line eyes
 */
export const LineFace = createFaceComponent("line");

/**
 * Curved eyes face - sleepy/happy curved eyes
 */
export const CurvedFace = createFaceComponent("curved");

/**
 * All available face components
 */
export const FACES = [RoundFace, CrossFace, LineFace, CurvedFace] as const;

export type FaceComponent = (typeof FACES)[number];
