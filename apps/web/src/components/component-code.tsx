import { CopyButton } from "./copy-button";

export function ComponentCode({
	code,
	highlightedCode,
}: {
	code: string;
	highlightedCode: string;
}) {
	return (
		<figure
			className="[&>pre]:max-h-96 [&>pre]:overflow-auto"
			data-rehype-pretty-code-figure=""
		>
			<CopyButton className="-right-5 -top-4 absolute" value={code} />
			<div
				className="[&_pre]:!bg-transparent dark:[&_pre]:!bg-transparent text-sm [&_pre]:border [&_pre]:border-transparent"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: ok
				dangerouslySetInnerHTML={{ __html: highlightedCode }}
			/>
		</figure>
	);
}

export function ComponentCodeReact({
	code,
	children,
}: {
	code: string;
	children: React.ReactNode;
}) {
	return (
		<>
			<CopyButton className="absolute top-1 right-1" value={code} />
			<figure
				className="[&>pre]:max-h-96 [&>pre]:overflow-auto"
				data-rehype-pretty-code-figure=""
			>
				<div className="[&_pre]:!bg-transparent dark:[&_pre]:!bg-transparent text-sm [&_pre]:border [&_pre]:border-transparent">
					{children}
				</div>
			</figure>
		</>
	);
}
