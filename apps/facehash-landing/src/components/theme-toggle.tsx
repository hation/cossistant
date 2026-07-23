"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <div className="h-9 w-9" />;
	}

	return (
		<button
			className="p-2 transition-colors hover:bg-[var(--muted)]"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
			type="button"
		>
			{theme === "dark" ? (
				<Sun className="h-5 w-5" />
			) : (
				<Moon className="h-5 w-5" />
			)}
		</button>
	);
}
