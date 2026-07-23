import { SidebarProvider } from "@/components/ui/sidebar";

export default function DocsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-1 flex-col">
			<SidebarProvider className="3xl:fixed:container min-h-min flex-1 3xl:fixed:px-3 px-0 [--docs-topbar-height:56px] [--sidebar-width:220px] [--top-spacing:0] lg:[--sidebar-width:240px] lg:[--top-spacing:calc(var(--spacing)*4)]">
				<div className="h-full w-full">{children}</div>
			</SidebarProvider>
		</div>
	);
}
