"use client";

import { Facehash } from "facehash";

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

// Positions optimized for 1200x630 OG image format
// Distributed around the edges to frame the center text
const OG_POSITIONS = [
	// Top row
	{ top: "8%", left: "5%" },
	{ top: "5%", left: "18%" },
	{ top: "10%", left: "32%" },
	{ top: "6%", right: "30%" },
	{ top: "8%", right: "15%" },
	{ top: "5%", right: "3%" },
	// Left side
	{ top: "35%", left: "3%" },
	{ top: "55%", left: "5%" },
	// Right side
	{ top: "38%", right: "4%" },
	{ top: "58%", right: "3%" },
	// Bottom row
	{ bottom: "8%", left: "4%" },
	{ bottom: "5%", left: "20%" },
	{ bottom: "10%", left: "35%" },
	{ bottom: "6%", right: "32%" },
	{ bottom: "8%", right: "16%" },
	{ bottom: "5%", right: "2%" },
];

const OG_SIZES = [
	52, 48, 44, 46, 50, 54, 48, 52, 50, 46, 54, 48, 44, 50, 52, 48,
];

export default function OgImageGeneratePage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-white p-8">
			<div
				className="relative overflow-hidden bg-[#0a0a0a]"
				style={{
					width: "1200px",
					height: "630px",
				}}
			>
				{/* Floating avatars around the edges */}
				{NAMES.map((name, index) => {
					const position = OG_POSITIONS[index];
					const size = OG_SIZES[index] ?? 48;

					return (
						<div
							className="absolute flex flex-col items-center gap-1"
							key={name}
							style={{
								...position,
							}}
						>
							<Facehash
								colors={COLORS}
								intensity3d="dramatic"
								interactive={false}
								name={name}
								size={size}
							/>
							<span
								style={{
									fontSize: Math.max(10, size / 4.5),
									color: "rgba(163, 163, 163, 0.8)",
								}}
							>
								{name.toLowerCase()}
							</span>
						</div>
					);
				})}

				{/* Center content - Logo */}
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					{/* Main title */}
					<h1
						className="flex justify-center gap-6 font-pixel text-7xl text-white"
						style={{ letterSpacing: "0.15em" }}
					>
						<span>F</span>
						<span>A</span>
						<span>C</span>
						<span>E</span>
						<span>H</span>
						<span>A</span>
						<span>S</span>
						<span>H</span>
					</h1>

					{/* Tagline */}
					<p
						className="mt-6 text-center font-pixel text-xl"
						style={{ color: "rgba(163, 163, 163, 0.9)" }}
					>
						beautiful minimalist avatars from any string for React
					</p>
				</div>

				{/* Subtle gradient overlay for depth */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
					}}
				/>
			</div>
		</div>
	);
}
