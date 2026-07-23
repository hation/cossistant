export type StoreListener<TState> = (state: TState) => void;

export type StoreUnsubscribe = () => void;

export type StoreUpdater<TState> = (state: TState) => TState;

export type Store<TState> = {
	getState(): TState;
	setState(updater: StoreUpdater<TState>): void;
	subscribe(listener: StoreListener<TState>): StoreUnsubscribe;
	batch(fn: () => void): void;
};

export function createStore<TState>(initialState: TState): Store<TState> {
	let state = initialState;
	const listeners = new Set<StoreListener<TState>>();
	let isBatching = false;
	let isQueued = false;

	const notify = () => {
		isQueued = false;
		for (const listener of listeners) {
			listener(state);
		}
	};

	const queueNotify = () => {
		if (isQueued) {
			return;
		}
		isQueued = true;
		queueMicrotask(notify);
	};

	return {
		getState() {
			return state;
		},
		setState(updater) {
			const nextState = updater(state);
			if (nextState === state) {
				return;
			}
			state = nextState;
			if (!isBatching) {
				queueNotify();
			}
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		batch(fn) {
			const wasBatching = isBatching;
			isBatching = true;
			try {
				fn();
			} finally {
				isBatching = wasBatching;
				if (!isBatching) {
					queueNotify();
				}
			}
		},
	};
}
