"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export const SHAPES = [
	{ id: "square", label: "square", radius: "0" },
	{ id: "squircle", label: "squircle", radius: "30%" },
	{ id: "rounded", label: "round", radius: "9999px" },
] as const;

export type ShapeId = (typeof SHAPES)[number]["id"];

type ShapeContextType = {
	shape: ShapeId;
	setShape: (shape: ShapeId) => void;
	borderRadius: string;
};

const ShapeContext = createContext<ShapeContextType | null>(null);

export function ShapeProvider({ children }: { children: ReactNode }) {
	const [shape, setShape] = useState<ShapeId>("square");

	const currentShape = SHAPES.find((s) => s.id === shape);
	const borderRadius = currentShape?.radius || "0";

	return (
		<ShapeContext.Provider value={{ shape, setShape, borderRadius }}>
			{children}
		</ShapeContext.Provider>
	);
}

export function useShape() {
	const context = useContext(ShapeContext);
	if (!context) {
		throw new Error("useShape must be used within a ShapeProvider");
	}
	return context;
}
