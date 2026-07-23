import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

export type UseComposerRefocusOptions = {
	disabled: boolean;
	hasContent: boolean;
	isSubmitting: boolean;
};

export type UseComposerRefocusReturn = {
	focusComposer: () => void;
	inputRef: MutableRefObject<HTMLTextAreaElement | null>;
};

export const useComposerRefocus = ({
	disabled,
	hasContent,
	isSubmitting,
}: UseComposerRefocusOptions): UseComposerRefocusReturn => {
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const previousStateRef = useRef({
		isSubmitting,
		hadContent: hasContent,
	});

	useEffect(() => {
		const previous = previousStateRef.current;

		if (
			!(disabled || hasContent) &&
			(previous.isSubmitting || previous.hadContent)
		) {
			inputRef.current?.focus();
		}

		previousStateRef.current = {
			isSubmitting,
			hadContent: hasContent,
		};
	}, [disabled, hasContent, isSubmitting]);

	const focusComposer = useCallback(() => {
		inputRef.current?.focus();
	}, []);

	return {
		focusComposer,
		inputRef,
	};
};
