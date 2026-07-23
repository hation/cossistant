import type { ReactElement } from "react";

import { useSupportNavigation } from "../store";
import { Text } from "../text";
import { CoButton } from "./button";
import Icon from "./icons";

/**
 * Tab bar used inside the widget header to switch between home and knowledge
 * base views.
 */
export function NavigationTab(): ReactElement {
	const { current, navigate } = useSupportNavigation();

	return (
		<div className="flex w-full items-center justify-center gap-2">
			<CoButton
				onClick={() => navigate({ page: "HOME" })}
				variant={current.page === "HOME" ? "tab-selected" : "tab"}
			>
				<Icon
					filledOnHover
					name="home"
					variant={current.page === "HOME" ? "filled" : "default"}
				/>
				<Text as="span" textKey="component.navigation.home" />
			</CoButton>
			<CoButton
				onClick={() => navigate({ page: "ARTICLES" })}
				variant={current.page === "ARTICLES" ? "tab-selected" : "tab"}
			>
				<Icon
					filledOnHover
					name="articles"
					variant={current.page === "ARTICLES" ? "filled" : "default"}
				/>
				<Text as="span" textKey="component.navigation.articles" />
			</CoButton>
		</div>
	);
}
