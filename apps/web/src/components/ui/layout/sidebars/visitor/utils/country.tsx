import * as flags from "country-flag-icons/react/3x2";

export function CountryFlag({ countryCode }: { countryCode: string }) {
	if (!(countryCode in flags)) {
		return null;
	}

	// biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic access needed for country flags based on runtime data
	const FlagComponent = flags[
		countryCode as keyof typeof flags
	] as React.ComponentType<React.SVGProps<SVGSVGElement>>;

	return (
		<span className="flex h-3.5 w-5 items-center justify-center overflow-clip">
			<FlagComponent className="h-full w-full" />
		</span>
	);
}
