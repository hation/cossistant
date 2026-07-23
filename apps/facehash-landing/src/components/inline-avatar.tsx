"use client";

import { Facehash } from "facehash";
import { useShape } from "./shape-context";

const COLORS = [
	"hsla(314, 100%, 80%, 1)",
	"hsla(58, 93%, 72%, 1)",
	"hsla(218, 92%, 72%, 1)",
	"hsla(19, 99%, 44%, 1)",
	"hsla(156, 86%, 40%, 1)",
];

export function InlineAvatar({ name }: { name: string }) {
	const { borderRadius } = useShape();

	return (
		<span className="inline-block align-middle">
			<Facehash
				className="text-black transition-[border-radius] duration-150"
				colors={COLORS}
				intensity3d="dramatic"
				name={name}
				size={16}
				style={{ borderRadius, display: "inline-flex" }}
			/>
		</span>
	);
}
