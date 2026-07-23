import { DemoFloatingAvatars } from "@/components/demo-floating-avatars";
import { DemoPage } from "@/components/demo-page";
import { ShapeProvider } from "@/components/shape-context";

export default function Demo() {
	return (
		<ShapeProvider>
			<div className="dark relative min-h-screen overflow-hidden bg-[var(--background)]">
				<DemoFloatingAvatars />
				<DemoPage />
			</div>
		</ShapeProvider>
	);
}
