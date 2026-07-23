import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { CossistantRestClient } from "./rest-client";

const visitorId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const trackedVisitorId = "01ARZ3NDEKTSV4RRFFQ69G5FAA";

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
	globalThis,
	"navigator"
);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
	globalThis,
	"window"
);
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

type StorageValueMap = Record<string, string>;

function createStorage() {
	const store: StorageValueMap = {};

	return {
		getItem(key: string) {
			return Object.hasOwn(store, key) ? store[key] : null;
		},
		setItem(key: string, value: string) {
			store[key] = String(value);
		},
		removeItem(key: string) {
			delete store[key];
		},
		clear() {
			for (const key of Object.keys(store)) {
				delete store[key];
			}
		},
		key(index: number) {
			return Object.keys(store)[index] ?? null;
		},
		get length() {
			return Object.keys(store).length;
		},
	} satisfies Storage;
}

function installBrowserEnvironment(params: {
	href: string;
	referrer: string;
	title: string;
}) {
	const windowListeners = new Map<string, Set<() => void>>();
	const documentListeners = new Map<string, Set<() => void>>();
	const localStorage = createStorage();
	const sessionStorage = createStorage();
	const location = {
		href: params.href,
	};
	const history = {
		pushState: (
			_state: unknown,
			_unused: string,
			url?: string | URL | null
		) => {
			if (!url) {
				return;
			}
			location.href = new URL(String(url), location.href).toString();
		},
		replaceState: (
			_state: unknown,
			_unused: string,
			url?: string | URL | null
		) => {
			if (!url) {
				return;
			}
			location.href = new URL(String(url), location.href).toString();
		},
	};
	const windowObject = {
		location,
		history,
		localStorage,
		sessionStorage,
		screen: {
			width: 1728,
			height: 1117,
		},
		innerWidth: 1440,
		innerHeight: 900,
		addEventListener(type: string, listener: () => void) {
			const existing = windowListeners.get(type) ?? new Set<() => void>();
			existing.add(listener);
			windowListeners.set(type, existing);
		},
		removeEventListener(type: string, listener: () => void) {
			windowListeners.get(type)?.delete(listener);
		},
		dispatch(type: string) {
			for (const listener of windowListeners.get(type) ?? []) {
				listener();
			}
		},
	};
	const documentObject = {
		referrer: params.referrer,
		title: params.title,
		visibilityState: "visible" as DocumentVisibilityState,
		addEventListener(type: string, listener: () => void) {
			const existing = documentListeners.get(type) ?? new Set<() => void>();
			existing.add(listener);
			documentListeners.set(type, existing);
		},
		removeEventListener(type: string, listener: () => void) {
			documentListeners.get(type)?.delete(listener);
		},
		dispatch(type: string) {
			for (const listener of documentListeners.get(type) ?? []) {
				listener();
			}
		},
	};

	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: windowObject,
	});
	Object.defineProperty(globalThis, "document", {
		configurable: true,
		value: documentObject,
	});
	Object.defineProperty(globalThis, "navigator", {
		configurable: true,
		value: {
			language: "en-US",
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36",
		},
	});
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: localStorage,
	});
	Object.defineProperty(globalThis, "sessionStorage", {
		configurable: true,
		value: sessionStorage,
	});

	return {
		window: windowObject,
		document: documentObject,
		setVisibilityState(nextState: DocumentVisibilityState) {
			documentObject.visibilityState = nextState;
			documentObject.dispatch("visibilitychange");
		},
	};
}

function createTrackedVisitorResponse() {
	return {
		id: trackedVisitorId,
		browser: "Chrome",
		browserVersion: "134.0",
		os: "macOS",
		osVersion: "15.0",
		device: "Mac",
		deviceType: "desktop",
		ip: null,
		city: null,
		region: null,
		country: null,
		countryCode: null,
		latitude: null,
		longitude: null,
		language: "en-US",
		timezone: "UTC",
		screenResolution: "1728x1117",
		viewport: "1440x900",
		createdAt: "2026-03-11T03:00:00.000Z",
		updatedAt: "2026-03-11T03:00:00.000Z",
		lastSeenAt: "2026-03-11T03:00:00.000Z",
		websiteId: "site-1",
		organizationId: "org-1",
		blockedAt: null,
		blockedByUserId: null,
		isBlocked: false,
		attribution: null,
		currentPage: null,
		contact: null,
	};
}

async function flushAsyncWork() {
	await new Promise((resolve) => setTimeout(resolve, 10));
}

beforeEach(() => {
	globalThis.fetch = originalFetch;
});

afterEach(() => {
	if (originalWindowDescriptor) {
		Object.defineProperty(globalThis, "window", originalWindowDescriptor);
	} else {
		Reflect.deleteProperty(globalThis, "window");
	}

	if (originalNavigatorDescriptor) {
		Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
	} else {
		Reflect.deleteProperty(globalThis, "navigator");
	}

	if (originalDocument) {
		Object.defineProperty(globalThis, "document", {
			configurable: true,
			value: originalDocument,
		});
	} else {
		Reflect.deleteProperty(globalThis, "document");
	}

	if (originalLocalStorage) {
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: originalLocalStorage,
		});
	} else {
		Reflect.deleteProperty(globalThis, "localStorage");
	}

	if (originalSessionStorage) {
		Object.defineProperty(globalThis, "sessionStorage", {
			configurable: true,
			value: originalSessionStorage,
		});
	} else {
		Reflect.deleteProperty(globalThis, "sessionStorage");
	}

	globalThis.setInterval = originalSetInterval;
	globalThis.clearInterval = originalClearInterval;
	globalThis.fetch = originalFetch;
});

function createFeedbackResponse() {
	return {
		feedback: {
			id: "feedback-1",
			organizationId: "org-1",
			websiteId: "site-1",
			conversationId: "conv-1",
			visitorId,
			contactId: "contact-1",
			rating: 5,
			topic: "Bug",
			comment: "The drawer closes unexpectedly",
			trigger: "billing_page",
			source: "widget",
			createdAt: "2026-03-11T03:00:00.000Z",
			updatedAt: "2026-03-11T03:00:00.000Z",
		},
	};
}

describe("CossistantRestClient.submitFeedback", () => {
	it("posts feedback with visitor headers and topic context", async () => {
		const client = new CossistantRestClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});
		client.setWebsiteContext("site-1", visitorId);

		const previousFetch = globalThis.fetch;
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify(createFeedbackResponse()), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				})
		);
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			const response = await client.submitFeedback({
				rating: 5,
				topic: "Bug",
				comment: "The drawer closes unexpectedly",
				trigger: "billing_page",
				conversationId: "conv-1",
				contactId: "contact-1",
			});

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			const headers = init.headers as Record<string, string>;
			const body = JSON.parse(String(init.body)) as Record<string, string>;

			expect(url).toBe("https://api.example.com/feedback");
			expect(init.method).toBe("POST");
			expect(headers["X-Visitor-Id"]).toBe(visitorId);
			expect(body).toEqual({
				rating: 5,
				source: "widget",
				topic: "Bug",
				comment: "The drawer closes unexpectedly",
				trigger: "billing_page",
				conversationId: "conv-1",
				contactId: "contact-1",
			});
			expect(response.feedback.topic).toBe("Bug");
			expect(response.feedback.trigger).toBe("billing_page");
		} finally {
			globalThis.fetch = previousFetch;
		}
	});

	it("throws when no visitor context is available", async () => {
		const client = new CossistantRestClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});

		await expect(client.submitFeedback({ rating: 4 })).rejects.toThrow(
			"Visitor ID is required to submit feedback"
		);
	});
});

describe("CossistantRestClient.submitConversationRating", () => {
	it("keeps the legacy rating request shape intact", async () => {
		const client = new CossistantRestClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});
		client.setWebsiteContext("site-1", visitorId);

		const previousFetch = globalThis.fetch;
		const fetchMock = mock(
			async () =>
				new Response(
					JSON.stringify({
						conversationId: "conv-1",
						rating: 4,
						ratedAt: "2026-03-11T03:00:00.000Z",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				)
		);
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			await client.submitConversationRating({
				conversationId: "conv-1",
				rating: 4,
				comment: "Solid support flow",
			});

			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
			const headers = init.headers as Record<string, string>;
			const body = JSON.parse(String(init.body)) as Record<string, string>;

			expect(url).toBe("https://api.example.com/conversations/conv-1/rating");
			expect(init.method).toBe("POST");
			expect(headers["X-Visitor-Id"]).toBe(visitorId);
			expect(body).toEqual({
				rating: 4,
				comment: "Solid support flow",
			});
		} finally {
			globalThis.fetch = previousFetch;
		}
	});
});

describe("CossistantRestClient.getWebsite visitor tracking", () => {
	it("tracks the initial pageview, skips duplicate SPA URLs, and tracks route changes", async () => {
		const browser = installBrowserEnvironment({
			href: "https://app.example.com/pricing?utm_source=hn&utm_medium=referral&utm_campaign=launch#hero",
			referrer: "https://news.ycombinator.com/item?id=1",
			title: "Pricing | Cossistant",
		});
		const client = new CossistantRestClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});
		const fetchMock = mock(async (input: string | URL, init?: RequestInit) => {
			const url = String(input);

			if (url.endsWith("/websites")) {
				return new Response(
					JSON.stringify({
						id: "site-1",
						name: "Cossistant",
						domain: "app.example.com",
						description: null,
						logoUrl: null,
						organizationId: "org-1",
						status: "active",
						lastOnlineAt: null,
						availableHumanAgents: [],
						availableAIAgents: [],
						visitor: {
							id: trackedVisitorId,
							isBlocked: false,
							language: "en-US",
							contact: null,
						},
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			if (url.endsWith(`/visitors/${trackedVisitorId}`)) {
				return new Response(JSON.stringify(createTrackedVisitorResponse()), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			if (url.endsWith(`/visitors/${trackedVisitorId}/activity`)) {
				return new Response(
					JSON.stringify({
						ok: true,
						acceptedAt: "2026-03-11T03:00:00.000Z",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
		});
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			await client.getWebsite();
			await flushAsyncWork();

			const patchRequests = fetchMock.mock.calls.filter(([input]) =>
				String(input).endsWith(`/visitors/${trackedVisitorId}`)
			) as [string, RequestInit][];
			const activityRequests = fetchMock.mock.calls.filter(([input]) =>
				String(input).endsWith(`/visitors/${trackedVisitorId}/activity`)
			) as [string, RequestInit][];

			expect(fetchMock).toHaveBeenCalledTimes(3);
			expect(patchRequests).toHaveLength(1);
			expect(activityRequests).toHaveLength(1);

			const firstPatch = patchRequests[0];
			const firstBody = JSON.parse(String(firstPatch[1].body)) as {
				attribution?: {
					firstTouch?: {
						channel?: string;
						referrer?: {
							domain?: string | null;
						};
					};
				};
				currentPage?: {
					path?: string | null;
					url?: string | null;
				};
			};

			expect(firstBody.attribution?.firstTouch?.channel).toBe("referral");
			expect(firstBody.attribution?.firstTouch?.referrer?.domain).toBe(
				"news.ycombinator.com"
			);
			expect(firstBody.currentPage?.path).toBe("/pricing");
			expect(firstBody.currentPage?.url).toBe(
				"https://app.example.com/pricing?utm_source=hn&utm_medium=referral&utm_campaign=launch"
			);

			const firstActivityBody = JSON.parse(
				String(activityRequests[0]?.[1].body)
			) as {
				activityType?: string;
				currentPage?: {
					path?: string | null;
				};
				sessionId?: string;
			};

			expect(firstActivityBody.activityType).toBe("connected");
			expect(firstActivityBody.currentPage?.path).toBe("/pricing");
			expect(firstActivityBody.sessionId).toBeString();

			browser.window.history.pushState(
				{},
				"",
				"/pricing?utm_source=hn&utm_medium=referral&utm_campaign=launch#details"
			);
			await flushAsyncWork();
			expect(fetchMock).toHaveBeenCalledTimes(3);

			browser.window.history.pushState(
				{},
				"",
				"/docs?utm_source=hn&utm_medium=referral&utm_campaign=launch"
			);
			await flushAsyncWork();

			const updatedPatchRequests = fetchMock.mock.calls.filter(([input]) =>
				String(input).endsWith(`/visitors/${trackedVisitorId}`)
			) as [string, RequestInit][];
			const updatedActivityRequests = fetchMock.mock.calls.filter(([input]) =>
				String(input).endsWith(`/visitors/${trackedVisitorId}/activity`)
			) as [string, RequestInit][];

			expect(fetchMock).toHaveBeenCalledTimes(5);
			expect(updatedPatchRequests).toHaveLength(2);
			expect(updatedActivityRequests).toHaveLength(2);

			const secondPatch = updatedPatchRequests[1];
			const secondBody = JSON.parse(String(secondPatch[1].body)) as {
				currentPage?: {
					path?: string | null;
				};
			};
			expect(secondBody.currentPage?.path).toBe("/docs");

			const secondActivityBody = JSON.parse(
				String(updatedActivityRequests[1]?.[1].body)
			) as {
				activityType?: string;
				currentPage?: {
					path?: string | null;
				};
			};
			expect(secondActivityBody.activityType).toBe("route_change");
			expect(secondActivityBody.currentPage?.path).toBe("/docs");
		} finally {
			client.destroy();
		}
	});

	it("posts focus and heartbeat activity over HTTP while the tab is visible", async () => {
		const browser = installBrowserEnvironment({
			href: "https://app.example.com/pricing?utm_source=hn&utm_medium=referral&utm_campaign=launch",
			referrer: "https://news.ycombinator.com/item?id=1",
			title: "Pricing | Cossistant",
		});
		const client = new CossistantRestClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});
		let heartbeatCallback: (() => void) | null = null;
		const setIntervalMock = mock((callback: TimerHandler) => {
			heartbeatCallback = callback as () => void;
			return 1 as ReturnType<typeof setInterval>;
		});
		const clearIntervalMock = mock(
			(_timer: ReturnType<typeof setInterval>) => {}
		);
		const fetchMock = mock(async (input: string | URL, init?: RequestInit) => {
			const url = String(input);

			if (url.endsWith("/websites")) {
				return new Response(
					JSON.stringify({
						id: "site-1",
						name: "Cossistant",
						domain: "app.example.com",
						description: null,
						logoUrl: null,
						organizationId: "org-1",
						status: "active",
						lastOnlineAt: null,
						availableHumanAgents: [],
						availableAIAgents: [],
						visitor: {
							id: trackedVisitorId,
							isBlocked: false,
							language: "en-US",
							contact: null,
						},
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			if (url.endsWith(`/visitors/${trackedVisitorId}`)) {
				return new Response(JSON.stringify(createTrackedVisitorResponse()), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			if (url.endsWith(`/visitors/${trackedVisitorId}/activity`)) {
				return new Response(
					JSON.stringify({
						ok: true,
						acceptedAt: "2026-03-11T03:00:00.000Z",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			throw new Error(`Unexpected fetch: ${url} ${init?.method ?? "GET"}`);
		});

		globalThis.fetch = fetchMock as typeof fetch;
		globalThis.setInterval = setIntervalMock as typeof setInterval;
		globalThis.clearInterval = clearIntervalMock as typeof clearInterval;

		try {
			await client.getWebsite();
			await flushAsyncWork();

			expect(setIntervalMock).toHaveBeenCalledTimes(1);
			expect(heartbeatCallback).not.toBeNull();

			heartbeatCallback?.();
			await flushAsyncWork();

			browser.window.dispatch("focus");
			await flushAsyncWork();

			const activityRequests = fetchMock.mock.calls.filter(([input]) =>
				String(input).endsWith(`/visitors/${trackedVisitorId}/activity`)
			) as [string, RequestInit][];
			const activityTypes = activityRequests.map(([, init]) => {
				const body = JSON.parse(String(init.body)) as {
					activityType?: string;
				};

				return body.activityType ?? null;
			});

			expect(activityTypes).toEqual(["connected", "heartbeat", "focus"]);
			expect(clearIntervalMock).toHaveBeenCalledTimes(1);

			browser.setVisibilityState("hidden");
			expect(clearIntervalMock).toHaveBeenCalledTimes(2);

			browser.setVisibilityState("visible");
			await flushAsyncWork();

			const refreshedActivityTypes = fetchMock.mock.calls
				.filter(([input]) =>
					String(input).endsWith(`/visitors/${trackedVisitorId}/activity`)
				)
				.map(([, init]) => {
					const body = JSON.parse(String(init.body)) as {
						activityType?: string;
					};

					return body.activityType ?? null;
				});

			expect(refreshedActivityTypes).toEqual([
				"connected",
				"heartbeat",
				"focus",
				"focus",
			]);
		} finally {
			client.destroy();
		}
	});
});
