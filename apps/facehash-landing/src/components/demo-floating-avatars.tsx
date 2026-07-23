"use client";

import { Facehash } from "facehash";
import { useShape } from "./shape-context";

const NAMES = [
	"Alice",
	"Bob",
	"Charlie",
	"Diana",
	"Eve",
	"Frank",
	"Grace",
	"Henry",
	"Ivy",
	"Jack",
	"Kate",
	"Leo",
	"Mia",
	"Noah",
	"Olivia",
	"Paul",
	"Quinn",
	"Ruby",
	"Sam",
	"Tina",
];

const COLORS = [
	"hsla(314, 100%, 80%, 1)",
	"hsla(58, 93%, 72%, 1)",
	"hsla(218, 92%, 72%, 1)",
	"hsla(19, 99%, 44%, 1)",
	"hsla(156, 86%, 40%, 1)",
	"hsla(314, 100%, 85%, 1)",
	"hsla(58, 92%, 79%, 1)",
	"hsla(218, 91%, 78%, 1)",
	"hsla(19, 99%, 50%, 1)",
	"hsla(156, 86%, 64%, 1)",
];

// Loading face indices — these get a spinner mouth
const LOADING_INDICES = [3, 12, 17];

function Spinner({ size = 10 }: { size?: number }) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			style={{ animation: "demo-spin 1s linear infinite" }}
			viewBox="0 0 24 24"
			width={size}
		>
			<circle
				cx="12"
				cy="12"
				fill="none"
				r="10"
				stroke="currentColor"
				strokeDasharray="32"
				strokeDashoffset="12"
				strokeLinecap="round"
				strokeWidth="3"
			/>
		</svg>
	);
}

function getPosition(index: number) {
	const positions = [
		{ top: "3%", left: "5%" },
		{ top: "8%", right: "8%" },
		{ top: "15%", left: "2%" },
		{ top: "12%", right: "3%" },
		{ top: "25%", right: "6%" },
		{ top: "6%", left: "20%" },
		{ top: "35%", left: "3%" },
		{ top: "22%", right: "12%" },
		{ top: "45%", right: "2%" },
		{ top: "10%", left: "40%" },
		{ top: "55%", left: "5%" },
		{ top: "40%", right: "8%" },
		{ top: "65%", right: "4%" },
		{ top: "18%", right: "20%" },
		{ top: "72%", left: "3%" },
		{ top: "58%", right: "10%" },
		{ top: "80%", right: "6%" },
		{ top: "30%", left: "1%" },
		{ top: "85%", left: "8%" },
		{ top: "70%", right: "2%" },
	];
	return positions[index % positions.length];
}

function getSize(index: number): number {
	const sizes = [36, 44, 52, 60, 40, 48, 56, 42, 50, 46, 38, 54];
	return sizes[index % sizes.length] ?? 44;
}

function getAnimationDelay(index: number) {
	return `${(index * 0.3) % 8}s`;
}

function getAnimationDuration(index: number) {
	const durations = [6, 7, 8, 9, 10, 7.5, 8.5, 6.5, 9.5, 11, 7, 8];
	return `${durations[index % durations.length]}s`;
}

// Bokeh effect — varying blur levels to simulate camera depth of field
function getBlur(index: number): string {
	const sharpIndices = [0, 2, 5, 7, 10, 12, 15, 18];
	const lightBlurIndices = [1, 6, 11, 16];
	const heavyBlurIndices = [3, 8, 13, 17];

	if (sharpIndices.includes(index)) {
		return "0";
	}
	if (lightBlurIndices.includes(index)) {
		return "1.5px";
	}
	if (heavyBlurIndices.includes(index)) {
		return "5px";
	}
	return "3px";
}

export function DemoFloatingAvatars() {
	const { borderRadius } = useShape();

	return (
		<div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
			{NAMES.map((name, index) => {
				const position = getPosition(index);
				const size = getSize(index);
				const isLoading = LOADING_INDICES.includes(index);
				const blur = getBlur(index);

				return (
					<div
						className="absolute flex animate-demo-float flex-col items-center"
						key={name}
						style={{
							...position,
							animationDelay: getAnimationDelay(index),
							animationDuration: getAnimationDuration(index),
							filter: blur !== "0" ? `blur(${blur})` : undefined,
						}}
					>
						<Facehash
							className="text-black"
							colors={COLORS}
							enableBlink
							intensity3d="dramatic"
							name={name}
							onRenderMouth={
								isLoading
									? () => <Spinner size={Math.round(size / 5)} />
									: undefined
							}
							size={size}
							style={{ borderRadius }}
						/>
					</div>
				);
			})}

			<style>{`
				@keyframes demo-float {
					0%, 100% {
						transform: translateY(0) rotate(0deg);
					}
					20% {
						transform: translateY(-35px) rotate(4deg);
					}
					40% {
						transform: translateY(-15px) rotate(-6deg);
					}
					60% {
						transform: translateY(-40px) rotate(3deg);
					}
					80% {
						transform: translateY(-10px) rotate(-4deg);
					}
				}

				@keyframes demo-spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}

				.animate-demo-float {
					animation: demo-float ease-in-out infinite;
				}
			`}</style>
		</div>
	);
}
