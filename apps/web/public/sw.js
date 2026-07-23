/// <reference lib="webworker" />

// Service Worker for Push Notifications

self.addEventListener("push", (event) => {
	if (!event.data) {
		return;
	}

	try {
		const data = event.data.json();

		const options = {
			body: data.body,
			icon: data.icon || "/web-app-manifest-192x192.png",
			badge: data.badge || "/web-app-manifest-192x192.png",
			tag: data.tag,
			vibrate: [100, 50, 100],
			data: data.data || {},
			actions: [
				{
					action: "open",
					title: "View conversation",
				},
				{
					action: "dismiss",
					title: "Dismiss",
				},
			],
		};

		event.waitUntil(self.registration.showNotification(data.title, options));
	} catch (error) {
		console.error("[SW] Error handling push event:", error);
	}
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (event.action === "dismiss") {
		return;
	}

	// Get the URL from notification data or default to root
	const urlPath = event.notification.data?.url || "/";

	// Construct full URL - the service worker doesn't have access to env vars
	// so we use the origin from the service worker's location
	const fullUrl = new URL(urlPath, self.location.origin).href;

	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				// Check if there's already a window open with our app
				for (const client of clientList) {
					// If we find a window with our origin, focus it and navigate
					if (
						client.url.startsWith(self.location.origin) &&
						"focus" in client
					) {
						return client.focus().then((focusedClient) => {
							if (focusedClient && "navigate" in focusedClient) {
								return focusedClient.navigate(fullUrl);
							}
						});
					}
				}

				// No existing window found, open a new one
				if (clients.openWindow) {
					return clients.openWindow(fullUrl);
				}
			})
	);
});

// Handle service worker installation
self.addEventListener("install", (event) => {
	// Skip waiting to activate immediately
	event.waitUntil(self.skipWaiting());
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
	// Claim all clients immediately
	event.waitUntil(self.clients.claim());
});
