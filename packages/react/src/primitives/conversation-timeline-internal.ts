import type * as React from "react";

export function mergeConversationTimelineStyles(
	styleProp: React.CSSProperties | undefined,
	scrollMaskStyle: React.CSSProperties
): React.CSSProperties | undefined {
	if (!(styleProp || Object.keys(scrollMaskStyle).length > 0)) {
		return;
	}

	if (!styleProp) {
		return scrollMaskStyle;
	}

	if (Object.keys(scrollMaskStyle).length === 0) {
		return styleProp;
	}

	return {
		...styleProp,
		...scrollMaskStyle,
	};
}

export function composeConversationTimelineScrollHandlers(
	internalOnScroll: React.UIEventHandler<HTMLDivElement>,
	externalOnScroll?: React.UIEventHandler<HTMLDivElement>
): React.UIEventHandler<HTMLDivElement> {
	if (!externalOnScroll) {
		return internalOnScroll;
	}

	return (event) => {
		internalOnScroll(event);
		externalOnScroll(event);
	};
}
