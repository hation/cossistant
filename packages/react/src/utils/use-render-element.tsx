/** biome-ignore-all lint/suspicious/noExplicitAny: works well here */
/** biome-ignore-all lint/nursery/noUnnecessaryConditions: ok */

import type { JSX } from "react";
import * as React from "react";
import { mergeRefs } from "./merge-refs";

/**
 * Gets the ref from a React element in a way that's compatible with both React 18 and React 19.
 *
 * - Before React 19: accessing `element.props.ref` throws a warning, use `element.ref`
 * - After React 19: accessing `element.ref` throws a warning, use `element.props.ref`
 *
 * This function detects which version of React is being used by checking for the
 * `isReactWarning` property descriptor that React adds in DEV mode.
 *
 * @see https://github.com/radix-ui/primitives/pull/2811
 */
function getElementRef(element: React.ReactElement): React.Ref<unknown> | null {
	// React 18 in DEV mode will throw a warning when accessing `element.props.ref`
	// and suggest using `element.ref` instead.
	// We detect this by checking for the `isReactWarning` getter on `props.ref`.
	const getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
	const mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;

	if (mayWarn) {
		// React 18: use element.ref
		return (element as any).ref;
	}

	// React 19 or production: prefer props.ref, fallback to element.ref for older versions
	return (element.props as any).ref ?? (element as any).ref;
}

type IntrinsicTag = keyof JSX.IntrinsicElements;

type ClassName<State> = string | ((state: State) => string);

type RenderFn<Props, State> = (
	props: Props,
	state: State
) => React.ReactElement;

type RenderProps<State, Tag extends IntrinsicTag> = {
	render?: React.ReactElement | RenderFn<JSX.IntrinsicElements[Tag], State>;
	className?: ClassName<State>;
	asChild?: boolean;
};

type RenderParams<State, Tag extends IntrinsicTag> = {
	state?: State;
	ref?: React.Ref<any>;
	props?: Partial<JSX.IntrinsicElements[Tag]>;
	enabled?: boolean;
};

type SlotProps = {
	children: React.ReactElement;
	[key: string]: any;
};

/**
 * Slot component that properly forwards refs when using asChild pattern.
 * Uses forwardRef to receive the ref and merges it with any existing ref on the child.
 */
const Slot = React.forwardRef<HTMLElement, SlotProps>(
	({ children, ...props }, forwardedRef) => {
		// Get the child's existing ref using React 18/19 compatible helper
		const childRef = getElementRef(children);

		// Merge the forwarded ref with the child's ref
		const mergedRef = mergeRefs([forwardedRef, childRef]);

		return React.cloneElement(children, {
			...props,
			ref: mergedRef,
			className: [(children.props as any).className, props.className]
				.filter(Boolean)
				.join(" "),
		} as any);
	}
);

/**
 * Utility hook to support slot-style component overrides.
 */
export function useRenderElement<
	State extends Record<string, any>,
	Tag extends IntrinsicTag,
>(
	tag: Tag,
	componentProps: RenderProps<State, Tag>,
	params?: RenderParams<State, Tag>
): React.ReactElement | null {
	const { render, className: classNameProp, asChild = false } = componentProps;

	const {
		state = {} as State,
		ref,
		props = {} as Partial<JSX.IntrinsicElements[Tag]>,
		enabled = true,
	} = params || {};

	if (!enabled) {
		return null;
	}

	const computedClassName =
		typeof classNameProp === "function" ? classNameProp(state) : classNameProp;

	const propsWithClassName = props as {
		className?: string;
		children?: React.ReactNode;
	};
	const mergedProps = {
		...props,
		className: [propsWithClassName.className, computedClassName]
			.filter(Boolean)
			.join(" "),
		ref,
	};

	if (typeof render === "function") {
		return render(mergedProps as JSX.IntrinsicElements[Tag], state);
	}

	if (React.isValidElement(render)) {
		return React.cloneElement(render, {
			...mergedProps,
			ref: getElementRef(render) || ref,
		});
	}

	if (asChild && React.isValidElement(propsWithClassName.children)) {
		// Extract ref to pass explicitly to the forwardRef Slot component
		// React extracts ref from spread props, so we must pass it separately
		const { ref: slotRef, ...restMergedProps } = mergedProps;
		return (
			<Slot ref={slotRef} {...restMergedProps}>
				{propsWithClassName.children}
			</Slot>
		);
	}

	return React.createElement(tag, mergedProps as any);
}
