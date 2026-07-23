"use client";

import { Facehash } from "facehash";
import { useCallback, useState } from "react";
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

// Cossistant brand colors
const COLORS = [
	"hsla(314, 100%, 80%, 1)", // pink
	"hsla(58, 93%, 72%, 1)", // yellow
	"hsla(218, 92%, 72%, 1)", // blue
	"hsla(19, 99%, 44%, 1)", // orange
	"hsla(156, 86%, 40%, 1)", // green
	"hsla(314, 100%, 85%, 1)", // light pink
	"hsla(58, 92%, 79%, 1)", // light yellow
	"hsla(218, 91%, 78%, 1)", // light blue
	"hsla(19, 99%, 50%, 1)", // light orange
	"hsla(156, 86%, 64%, 1)", // light green
];

// Max inflation level before deflate
const MAX_INFLATION = 4;

// Deterministic positions based on index
function getPosition(index: number) {
	const positions = [
		{ top: "5%", left: "8%" },
		{ top: "12%", right: "12%" },
		{ top: "25%", left: "3%" },
		{ top: "18%", right: "5%" },
		{ top: "35%", right: "8%" },
		{ top: "8%", left: "25%" },
		{ top: "45%", left: "5%" },
		{ top: "30%", right: "15%" },
		{ top: "55%", right: "3%" },
		{ top: "15%", left: "45%" },
		{ top: "65%", left: "8%" },
		{ top: "50%", right: "10%" },
		{ top: "75%", right: "6%" },
		{ top: "22%", right: "25%" },
		{ top: "80%", left: "4%" },
		{ top: "68%", right: "12%" },
		{ top: "85%", right: "8%" },
		{ top: "40%", left: "2%" },
		{ top: "90%", left: "10%" },
		{ top: "78%", right: "4%" },
	];
	return positions[index % positions.length];
}

function getSize(index: number): number {
	const sizes = [32, 40, 48, 56, 36, 44, 52, 38, 46, 42];
	return sizes[index % sizes.length] ?? 40;
}

function getAnimationDelay(index: number) {
	return `${(index * 0.5) % 10}s`;
}

function getAnimationDuration(index: number) {
	const durations = [15, 18, 20, 22, 17, 19, 21, 16, 23, 14];
	return `${durations[index % durations.length]}s`;
}

// Bokeh effect - varying blur levels to simulate camera depth of field
function getBlur(index: number): string {
	const sharpIndices = [0, 2, 5, 7, 10, 12, 15, 18];
	const lightBlurIndices = [1, 6, 11, 16];
	const heavyBlurIndices = [3, 8, 13, 17];

	if (sharpIndices.includes(index)) {
		return "0";
	}
	if (lightBlurIndices.includes(index)) {
		return "1px";
	}
	if (heavyBlurIndices.includes(index)) {
		return "6px";
	}
	return "3px";
}

// Some avatars blink randomly (deterministic based on index)
function shouldBlink(index: number): boolean {
	const blinkingIndices = [1, 4, 7, 11, 14, 17];
	return blinkingIndices.includes(index);
}

// Random rotation for each inflation level
function getInflationRotation(level: number): number {
	const rotations = [0, 15, -20, 25, -30];
	return rotations[level] ?? 0;
}

type AvatarState = {
	inflation: number;
	isDeflating: boolean;
	rotation: number;
};

export function FloatingAvatars() {
	const { borderRadius } = useShape();
	const [avatarStates, setAvatarStates] = useState<Record<string, AvatarState>>(
		{}
	);

	const handleClick = useCallback((name: string) => {
		setAvatarStates((prev) => {
			const current = prev[name] || {
				inflation: 0,
				isDeflating: false,
				rotation: 0,
			};

			// If already deflating, ignore clicks
			if (current.isDeflating) {
				return prev;
			}

			const newInflation = current.inflation + 1;

			// Time to pop!
			if (newInflation > MAX_INFLATION) {
				// Respawn after a delay (animation 800ms + pause 2500ms)
				setTimeout(() => {
					setAvatarStates((p) => ({
						...p,
						[name]: { inflation: 0, isDeflating: false, rotation: 0 },
					}));
				}, 3300);

				return {
					...prev,
					[name]: {
						inflation: current.inflation,
						isDeflating: true,
						rotation: 360,
					},
				};
			}

			// Inflate with new rotation
			return {
				...prev,
				[name]: {
					inflation: newInflation,
					isDeflating: false,
					rotation: getInflationRotation(newInflation),
				},
			};
		});
	}, []);

	return (
		<div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
			{NAMES.map((name, index) => {
				const position = getPosition(index);
				const baseSize = getSize(index);
				const blur = getBlur(index);
				const state = avatarStates[name] || {
					inflation: 0,
					isDeflating: false,
					rotation: 0,
				};

				// Calculate current size based on inflation
				const sizeMultiplier = 1 + state.inflation * 0.3;
				const currentSize = state.isDeflating
					? baseSize * 0.5
					: baseSize * sizeMultiplier;

				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: Decorative easter egg, not essential functionality
					// biome-ignore lint/a11y/noStaticElementInteractions: Decorative element with fun interaction
					// biome-ignore lint/a11y/noNoninteractiveElementInteractions: Easter egg interaction on decorative avatars
					<div
						className={`absolute flex cursor-pointer flex-col items-center gap-1 transition-[filter] duration-300 ${
							state.inflation === 0 && !state.isDeflating
								? "hover:!filter-none animate-float"
								: "hover:!filter-none"
						} ${state.isDeflating ? "animate-deflate" : state.inflation > 0 ? "animate-wobble" : ""}`}
						key={name}
						onClick={() => handleClick(name)}
						style={{
							...position,
							animationDelay:
								state.inflation === 0 ? getAnimationDelay(index) : "0s",
							animationDuration:
								state.inflation === 0 ? getAnimationDuration(index) : "0.3s",
							filter:
								blur !== "0" && state.inflation === 0
									? `blur(${blur})`
									: undefined,
							transform: `rotate(${state.rotation}deg) scale(${state.isDeflating ? 0 : 1})`,
							transition: state.isDeflating
								? "transform 0.5s cubic-bezier(0.36, 0, 0.66, -0.56), opacity 0.5s ease-out"
								: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
							opacity: state.isDeflating ? 0 : 1,
							zIndex: state.inflation > 0 ? 100 : undefined,
						}}
					>
						<Facehash
							className="text-black transition-[border-radius] duration-150"
							colors={COLORS}
							enableBlink={shouldBlink(index)}
							intensity3d="dramatic"
							interactive={true}
							name={name}
							size={currentSize}
							style={{ borderRadius }}
						/>
						<span
							className="text-[10px] text-[var(--muted-foreground)] transition-all duration-200"
							style={{
								fontSize: Math.max(8, currentSize / 5),
								fontWeight: state.inflation > 2 ? "bold" : "normal",
							}}
						>
							{state.inflation > 3
								? `${name.toLowerCase()}!!!`
								: state.inflation > 1
									? `${name.toLowerCase()}!`
									: name.toLowerCase()}
						</span>
					</div>
				);
			})}

			<style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
          }
          75% {
            transform: translateY(-25px) rotate(2deg);
          }
        }

        @keyframes wobble {
          0%, 100% {
            transform: rotate(var(--rotation, 0deg)) scale(1);
          }
          25% {
            transform: rotate(calc(var(--rotation, 0deg) + 5deg)) scale(1.05);
          }
          75% {
            transform: rotate(calc(var(--rotation, 0deg) - 5deg)) scale(0.95);
          }
        }

        @keyframes deflate {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          15% {
            transform: scale(1.15) rotate(5deg);
            opacity: 1;
          }
          30% {
            transform: scale(1.1) rotate(-3deg);
            opacity: 0.9;
          }
          50% {
            transform: scale(0.8) rotate(8deg);
            opacity: 0.7;
          }
          70% {
            transform: scale(0.4) rotate(-5deg);
            opacity: 0.4;
          }
          100% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
        }

        .animate-float {
          animation: float ease-in-out infinite;
        }

        .animate-wobble {
          animation: wobble 0.3s ease-in-out;
        }

        .animate-deflate {
          animation: deflate 0.8s ease-out forwards;
        }
      `}</style>
		</div>
	);
}
