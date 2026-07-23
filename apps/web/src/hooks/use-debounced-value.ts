import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 300) {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		if (delay === 0) {
			setDebouncedValue(value);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [value, delay]);

	return debouncedValue;
}
