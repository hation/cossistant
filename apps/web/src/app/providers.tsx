"use client";

import { SupportProvider } from "@cossistant/next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { TRPCReactProvider } from "@/lib/trpc/client";

type ProviderProps = {
	//   locale: string;
	children: ReactNode;
};

const API_URL =
	process.env.NODE_ENV === "development"
		? "http://localhost:8787/v1"
		: "https://api.cossistant.com/v1";

const WS_URL =
	process.env.NODE_ENV === "development"
		? "ws://localhost:8787/ws"
		: "wss://api.cossistant.com/ws";

const PUBLIC_KEY = "pk_8bd6aaa329955e847f6cdbe8cdd353a145a70bc4129aa66398cbdb5728a4e064";

export function Providers({ children }: ProviderProps) {
	return (
		<SupportProvider apiUrl={API_URL} publicKey={PUBLIC_KEY} wsUrl={WS_URL}>
			<NuqsAdapter>
				<RootProvider
					search={{
						enabled: false,
					}}
					theme={{
						attribute: "class",
						defaultTheme: "system",
						enableSystem: true,
						disableTransitionOnChange: true,
					}}
				>
					<TRPCReactProvider>{children}</TRPCReactProvider>
				</RootProvider>
			</NuqsAdapter>
		</SupportProvider>
	);
}
