"use client";

import { useState } from "react";

export function useChangelogOverlayState() {
	const [isChangelogOpen, setIsChangelogOpen] = useState(false);

	return {
		isChangelogOpen,
		setIsChangelogOpen,
	};
}
