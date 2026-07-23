"use client";

import { Globe } from "../globe";

export const AiAgentsGraphic = () => (
	<div className="relative h-full w-full overflow-hidden">
		<div className="absolute right-0 bottom-0 left-0 z-10 h-6 bg-gradient-to-t from-background via-background to-transparent" />
		<Globe allowDrag={false} rotationSpeed={12} tilt={12} />
	</div>
);
