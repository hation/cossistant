import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="w-full max-w-2xl space-y-6 px-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
				<div className="space-y-4 pt-8">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			</div>
		</div>
	);
}
