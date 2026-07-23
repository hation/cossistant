"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Facehash,
	type FacehashProps,
} from "facehash";
import { useShape } from "./shape-context";

// Wrapper with default text-black for the landing page demos
function Face({ className, ...props }: FacehashProps) {
	return (
		<Facehash
			className={["text-black", className].filter(Boolean).join(" ")}
			{...props}
		/>
	);
}

// Simple spinner component for demo
function Spinner({ size = 12 }: { size?: number }) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			style={{
				animation: "spin 1s linear infinite",
			}}
			viewBox="0 0 24 24"
			width={size}
		>
			<style>
				{
					"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"
				}
			</style>
			<circle
				cx="12"
				cy="12"
				fill="none"
				r="10"
				stroke="currentColor"
				strokeDasharray="32"
				strokeDashoffset="12"
				strokeLinecap="round"
				strokeWidth="3"
			/>
		</svg>
	);
}

const COLORS = [
	"hsla(314, 100%, 80%, 1)",
	"hsla(58, 93%, 72%, 1)",
	"hsla(218, 92%, 72%, 1)",
	"hsla(19, 99%, 44%, 1)",
	"hsla(156, 86%, 40%, 1)",
];

const CUSTOM_COLORS = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];

type ExampleProps = {
	label: string;
	isDefault?: boolean;
	children: React.ReactNode;
};

function Example({ label, isDefault, children }: ExampleProps) {
	return (
		<div className="flex flex-col items-center gap-2">
			{children}
			<span className="text-[var(--muted-foreground)] text-xs">
				{label}
				{isDefault && (
					<span className="ml-1 text-[var(--foreground)]">(default)</span>
				)}
			</span>
		</div>
	);
}

type PropSectionProps = {
	name: string;
	code: string;
	children: React.ReactNode;
};

function PropSection({ name, code, children }: PropSectionProps) {
	return (
		<div className="mb-10">
			<p className="mb-2 font-medium text-sm">{name}</p>
			<pre className="mb-4 overflow-x-auto bg-[var(--foreground)]/[0.05] p-3 text-[var(--foreground)]/70 text-sm">
				<code>{code}</code>
			</pre>
			<div className="flex flex-wrap items-end gap-6">{children}</div>
		</div>
	);
}

export function PropsExamples() {
	const { borderRadius } = useShape();

	return (
		<div>
			{/* name - different strings = different faces */}
			<PropSection
				code={`import { Facehash } from "facehash";

<Facehash name="alice" />
<Facehash name="bob" />
<Facehash name="charlie" />`}
				name="name"
			>
				<Example label='"alice"'>
					<Face
						colors={COLORS}
						name="alice"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label='"bob"'>
					<Face colors={COLORS} name="bob" size={48} style={{ borderRadius }} />
				</Example>
				<Example label='"charlie"'>
					<Face
						colors={COLORS}
						name="charlie"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* size */}
			<PropSection
				code={`<Facehash name="facehash" size={32} />
<Facehash name="facehash" size={48} />
<Facehash name="facehash" size={64} />`}
				name="size"
			>
				<Example label="32">
					<Face
						colors={COLORS}
						name="facehash"
						size={32}
						style={{ borderRadius }}
					/>
				</Example>
				<Example isDefault label="40">
					<Face
						colors={COLORS}
						name="facehash"
						size={40}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="48">
					<Face
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="64">
					<Face
						colors={COLORS}
						name="facehash"
						size={64}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* colors */}
			<PropSection
				code={`<Facehash name="facehash" colors={["#264653", "#2a9d8f", "#e9c46a"]} />`}
				name="colors"
			>
				<Example label="default">
					<Face
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="custom">
					<Face
						colors={CUSTOM_COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* intensity3d */}
			<PropSection
				code={`<Facehash name="facehash" intensity3d="none" />
<Facehash name="facehash" intensity3d="subtle" />
<Facehash name="facehash" intensity3d="dramatic" />`}
				name="intensity3d"
			>
				<Example label="none">
					<Face
						colors={COLORS}
						intensity3d="none"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="subtle">
					<Face
						colors={COLORS}
						intensity3d="subtle"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="medium">
					<Face
						colors={COLORS}
						intensity3d="medium"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example isDefault label="dramatic">
					<Face
						colors={COLORS}
						intensity3d="dramatic"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* showInitial */}
			<PropSection
				code={`<Facehash name="facehash" showInitial={true} />
<Facehash name="facehash" showInitial={false} />`}
				name="showInitial"
			>
				<Example isDefault label="true">
					<Face
						colors={COLORS}
						name="facehash"
						showInitial={true}
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="false">
					<Face
						colors={COLORS}
						name="facehash"
						showInitial={false}
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* variant */}
			<PropSection
				code={`<Facehash name="facehash" variant="gradient" />
<Facehash name="facehash" variant="solid" />`}
				name="variant"
			>
				<Example isDefault label="gradient">
					<Face
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
						variant="gradient"
					/>
				</Example>
				<Example label="solid">
					<Face
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
						variant="solid"
					/>
				</Example>
			</PropSection>

			{/* enableBlink */}
			<PropSection
				code={`<Facehash name="facehash" enableBlink />
<Facehash name="alice" enableBlink />
<Facehash name="bob" enableBlink />`}
				name="enableBlink"
			>
				<Example isDefault label="false">
					<Face
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="true">
					<Face
						colors={COLORS}
						enableBlink
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label='"alice"'>
					<Face
						colors={COLORS}
						enableBlink
						name="alice"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label='"bob"'>
					<Face
						colors={COLORS}
						enableBlink
						name="bob"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* onRenderMouth */}
			<PropSection
				code={`<Facehash name="loading" onRenderMouth={() => <Spinner />} />
<Facehash name="thinking" enableBlink onRenderMouth={() => <Spinner />} />`}
				name="onRenderMouth"
			>
				<Example label="default">
					<Face
						colors={COLORS}
						name="loading"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="spinner">
					<Face
						colors={COLORS}
						name="loading"
						onRenderMouth={() => <Spinner size={10} />}
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="thinking">
					<Face
						colors={COLORS}
						enableBlink
						name="thinking"
						onRenderMouth={() => <Spinner size={10} />}
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* className - CSS styling */}
			<PropSection
				code={`// Style face color and font with Tailwind classes
<Facehash name="ghost" className="text-white" />

// For app-wide defaults, create a wrapper with tailwind-merge:
import { Facehash, type FacehashProps } from "facehash";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: FacehashProps) {
  return (
    <Facehash
      className={cn("text-black font-pixel font-bold", className)}
      {...props}
    />
  );
}

// Now overrides work naturally:
<Avatar name="user" />                        // defaults
<Avatar name="user" className="text-red-500" /> // red color`}
				name="className (styling)"
			>
				<Example label="default">
					<Face
						colors={COLORS}
						name="style-demo"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="text-white">
					<Face
						className="text-white"
						colors={COLORS}
						name="style-demo"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="font-sans">
					<Face
						className="font-normal font-sans"
						colors={COLORS}
						name="style-demo"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* Avatar with fallback - optional wrapper */}
			<div className="relative mt-16 pt-10">
				{/* Full-width top border */}
				<div className="-translate-x-1/2 absolute top-0 left-1/2 w-screen border-[var(--border)] border-t border-dashed" />
				<p className="mb-6 text-[var(--muted-foreground)] text-sm">
					need an image with fallback? use the Avatar wrapper:
				</p>
				<PropSection
					code={`import { Avatar, AvatarImage, AvatarFallback } from "facehash";

<Avatar>
  <AvatarImage src="/photo.jpg" />
  <AvatarFallback name="anthony" />
</Avatar>`}
					name="Avatar"
				>
					<Example label="image loads">
						<Avatar
							style={{
								width: 48,
								height: 48,
								borderRadius,
								overflow: "hidden",
							}}
						>
							<AvatarImage
								alt="anthony"
								src="https://pbs.twimg.com/profile_images/1952043514692280321/v4gOT-jg_400x400.jpg"
							/>
							<AvatarFallback
								facehashProps={{ className: "text-black" }}
								name="anthony"
							/>
						</Avatar>
					</Example>
					<Example label="image fails">
						<Avatar
							style={{
								width: 48,
								height: 48,
								borderRadius,
								overflow: "hidden",
							}}
						>
							<AvatarImage alt="anthony" src="/broken-image.jpg" />
							<AvatarFallback
								facehashProps={{ colors: COLORS, className: "text-black" }}
								name="anthony"
							/>
						</Avatar>
					</Example>
					<Example label="no image">
						<Avatar
							style={{
								width: 48,
								height: 48,
								borderRadius,
								overflow: "hidden",
							}}
						>
							<AvatarFallback
								facehashProps={{ colors: COLORS, className: "text-black" }}
								name="anthony"
							/>
						</Avatar>
					</Example>
				</PropSection>
			</div>
		</div>
	);
}
