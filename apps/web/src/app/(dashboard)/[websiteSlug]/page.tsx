"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

export default function Page({
	params,
}: {
	params: Promise<{ websiteSlug: string }>;
}) {
	const { websiteSlug } = use(params);
	const router = useRouter();

	useEffect(() => {
		router.replace(`/${websiteSlug}/inbox`);
	}, [websiteSlug]);
}
