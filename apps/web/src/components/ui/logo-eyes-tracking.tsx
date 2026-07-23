"use client";

import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
	className?: string;
};

// Path data constants
const OUTLINE_D =
	"M-3.60734e-06 22.528C-3.56276e-06 21.5083 -3.54048e-06 20.9985 0.196795 20.5443C0.393593 20.09 0.765562 19.7414 1.5095 19.044L20.4473 1.29144C21.1278 0.653532 21.4681 0.334578 21.8911 0.167287C22.3142 -4.13885e-06 22.7806 -4.11846e-06 23.7133 -4.07769e-06L93.2867 -1.03654e-06C94.2194 -9.95772e-07 94.6858 -9.75386e-07 95.1088 0.16729C95.5319 0.334581 95.8722 0.653535 96.5527 1.29144L115.49 19.044C116.234 19.7414 116.606 20.0901 116.803 20.5443C117 20.9985 117 21.5084 117 22.5281L117 91.2245C117 93.4757 117 94.6013 116.301 95.3006C115.601 96 114.476 96 112.224 96L95.175 96L23.6981 96C22.7727 96 22.31 96 21.8897 95.8351C21.4693 95.6702 21.13 95.3557 20.4514 94.7265L1.52875 77.1831C0.775476 76.4848 0.398839 76.1356 0.199416 75.6788C-5.91066e-06 75.2219 -5.88821e-06 74.7083 -5.84331e-06 73.6811L-3.60734e-06 22.528Z";
// Scale down the logo path to fit 117x96 viewBox (approximately 0.334 scale)
const LOGO_D =
	"M116.690237 20.3837V95.6H21.8431L0.169596 75.2397V20.3837L21.8431 0H94.6837l21.6735 20.3837Zm-89.3186 12.4433c-1.2726.0001-2.4883.5191-3.3663 1.4369l-3.7523 3.9223c-.8366.8747-1.2997 2.0407-1.291 3.2507l.0609 8.456H27.0143l-.0746-4.482c0-3.2753.781-3.8937 4.2503-3.8937h7.6162c3.4693 0 3.9867.6184 3.9867 4.1523v4.2233h8.406v-8.4576c0-1.209-.4708-2.3707-1.3123-3.239l-3.8323-3.9543c-.8767-.9044-2.0823-1.4149-3.342-1.4149H27.0384Zm41.8886 0c-1.27 0-2.4833.519-3.3633 1.4369l-3.752 3.9223c-.8367.8747-1.3 2.0407-1.291 3.2507l.0607 8.456h8.3217l-.0747-4.482c0-3.2753.7811-3.8937 4.2504-3.8937h7.6163c3.4693 0 3.9863.6184 3.9863 4.1523v4.2233h8.4063v-8.4576c0-1.209-.471-2.3707-1.3127-3.239l-3.8323-3.9543c-.8767-.9043-2.0823-1.4149-3.342-1.4149h-15.674Z";

export function LogoEyesTracking({ className }: Props) {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
	const [isClose, setIsClose] = useState(false);
	const [leftOffset, setLeftOffset] = useState({ x: 0, y: 0 });
	const [rightOffset, setRightOffset] = useState({ x: 0, y: 0 });
	const { resolvedTheme } = useTheme();

	// Eye center positions in SVG coordinate space
	const leftEyeCenter = { x: 33.6118, y: 48 };
	const rightEyeCenter = { x: 82.3882, y: 48 };
	const maxOffset = 6; // Maximum pupil offset in SVG units
	const proximityThreshold = 200; // Proximity threshold in pixels

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setCursor({ x: e.clientX, y: e.clientY });

			if (svgRef.current) {
				const rect = svgRef.current.getBoundingClientRect();

				// Check proximity
				const distX = Math.max(
					0,
					Math.max(rect.left - e.clientX, e.clientX - rect.right)
				);
				const distY = Math.max(
					0,
					Math.max(rect.top - e.clientY, e.clientY - rect.bottom)
				);
				const distance = Math.sqrt(distX * distX + distY * distY);
				setIsClose(distance < proximityThreshold);

				// Convert mouse position to SVG coordinates
				const svgPoint = svgRef.current.createSVGPoint();
				svgPoint.x = e.clientX;
				svgPoint.y = e.clientY;
				const ctm = svgRef.current.getScreenCTM();
				if (ctm) {
					const localPoint = svgPoint.matrixTransform(ctm.inverse());

					// Calculate offsets for left eye
					const leftDx = localPoint.x - leftEyeCenter.x;
					const leftDy = localPoint.y - leftEyeCenter.y;
					const leftDist = Math.sqrt(leftDx * leftDx + leftDy * leftDy);
					const leftNormX = leftDist > 0 ? leftDx / leftDist : 0;
					const leftNormY = leftDist > 0 ? leftDy / leftDist : 0;
					setLeftOffset({
						x: leftNormX * Math.min(maxOffset, leftDist * 0.1),
						y: leftNormY * Math.min(maxOffset, leftDist * 0.1),
					});

					// Calculate offsets for right eye
					const rightDx = localPoint.x - rightEyeCenter.x;
					const rightDy = localPoint.y - rightEyeCenter.y;
					const rightDist = Math.sqrt(rightDx * rightDx + rightDy * rightDy);
					const rightNormX = rightDist > 0 ? rightDx / rightDist : 0;
					const rightNormY = rightDist > 0 ? rightDy / rightDist : 0;
					setRightOffset({
						x: rightNormX * Math.min(maxOffset, rightDist * 0.1),
						y: rightNormY * Math.min(maxOffset, rightDist * 0.1),
					});
				}
			}
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	const resolvedColor = resolvedTheme === "dark" ? "black" : "white";

	return (
		<div
			className="relative"
			style={{ width: "fit-content", height: "fit-content" }}
		>
			{/* Eyes tracking logo */}
			<svg
				className={cn(className, "text-primary")}
				fill="none"
				height="96"
				ref={svgRef}
				style={{
					opacity: isClose ? 0 : 1,
					transition: "opacity 0.05s ease-in-out",
				}}
				viewBox="0 0 117 96"
				width="117"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Cossistant Logo Eyes Tracking</title>

				{/* Outer path */}
				<path d={OUTLINE_D} fill={resolvedColor} />

				{/* Left eye */}
				<circle cx="33.6118" cy="48" fill="currentColor" r="22.8882" />

				{/* Left pupil with tracking */}
				<motion.g
					animate={{
						x: leftOffset.x,
						y: leftOffset.y,
					}}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 25,
					}}
				>
					<path
						d="M33.6118 35.8096C34.1872 35.8096 34.7155 35.8082 35.1538 35.8467C35.6117 35.8869 36.112 35.9795 36.5981 36.249C37.1712 36.5669 37.6436 37.0393 37.9614 37.6123C38.231 38.0985 38.3236 38.5987 38.3638 39.0566C38.4022 39.4949 38.4009 40.0233 38.4009 40.5986V43.2109H41.0132C41.5878 43.2109 42.1163 43.209 42.5542 43.2471C43.0117 43.2869 43.5126 43.3795 43.9995 43.6494C44.5726 43.9673 45.045 44.4399 45.3628 45.0127L45.4565 45.1953C45.6555 45.6232 45.73 46.0563 45.7651 46.457C45.8036 46.8956 45.8022 47.4244 45.8022 48C45.8022 48.5754 45.8036 49.1037 45.7651 49.542C45.7249 49.9999 45.6322 50.5002 45.3628 50.9863C45.045 51.5594 44.5725 52.0318 43.9995 52.3496C43.5132 52.6193 43.0131 52.7118 42.5552 52.752C42.336 52.7712 42.0943 52.7807 41.8354 52.7852L41.0132 52.7891H38.4009V55.4014C38.4009 55.9767 38.4022 56.5051 38.3638 56.9434C38.3236 57.4013 38.2311 57.9014 37.9614 58.3877C37.6436 58.9607 37.1712 59.4331 36.5981 59.751C36.112 60.0204 35.6117 60.1131 35.1538 60.1533C34.7155 60.1918 34.1872 60.1904 33.6118 60.1904C33.0362 60.1904 32.5074 60.1918 32.0688 60.1533C31.6681 60.1182 31.235 60.0437 30.8071 59.8447L30.6245 59.751C30.0517 59.4332 29.5791 58.9608 29.2612 58.3877C28.9914 57.9008 28.8987 57.3999 28.8589 56.9424C28.8208 56.5045 28.8228 55.976 28.8228 55.4014V52.7891H26.2104C25.6351 52.7891 25.1067 52.7904 24.6685 52.752C24.2105 52.7118 23.7103 52.6192 23.2241 52.3496C22.6511 52.0318 22.1787 51.5594 21.8608 50.9863C21.5913 50.5002 21.4987 49.9999 21.4585 49.542C21.4201 49.1037 21.4214 48.5753 21.4214 48C21.4214 47.4244 21.42 46.8956 21.4585 46.457C21.4987 45.9991 21.5911 45.4991 21.8608 45.0127L21.9868 44.8027C22.2979 44.3242 22.7225 43.9276 23.2241 43.6494L23.2251 43.6484C23.7117 43.3789 24.2121 43.2879 24.6694 43.248C25.1074 43.2099 25.6357 43.2109 26.2104 43.2109H28.8228V40.5986L28.8267 39.7764C28.831 39.5178 28.8408 39.2765 28.8599 39.0576C28.8997 38.6001 28.9905 38.0991 29.2603 37.6123H29.2612C29.5791 37.0391 30.0518 36.5667 30.6245 36.249L30.8071 36.1553C31.235 35.9563 31.6681 35.8818 32.0688 35.8467C32.5074 35.8082 33.0362 35.8096 33.6118 35.8096Z"
						fill={resolvedColor}
						stroke={resolvedColor}
						strokeWidth="2"
					/>
				</motion.g>

				{/* Right eye */}
				<circle cx="82.3882" cy="48" fill="currentColor" r="22.8882" />

				{/* Right pupil with tracking */}
				<motion.g
					animate={{
						x: rightOffset.x,
						y: rightOffset.y,
					}}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 25,
					}}
				>
					<path
						d="M82.3882 35.8096C82.9635 35.8096 83.4919 35.8082 83.9302 35.8467C84.3881 35.8869 84.8884 35.9795 85.3745 36.249C85.9476 36.5669 86.42 37.0393 86.7378 37.6123C87.0074 38.0985 87.0999 38.5987 87.1401 39.0566C87.1786 39.4949 87.1772 40.0233 87.1772 40.5986V43.2109H89.7896C90.3642 43.2109 90.8927 43.209 91.3306 43.2471C91.7881 43.2869 92.289 43.3795 92.7759 43.6494C93.349 43.9673 93.8214 44.4399 94.1392 45.0127L94.2329 45.1953C94.4319 45.6232 94.5064 46.0563 94.5415 46.457C94.58 46.8956 94.5786 47.4244 94.5786 48C94.5786 48.5754 94.58 49.1037 94.5415 49.542C94.5013 49.9999 94.4086 50.5002 94.1392 50.9863C93.8213 51.5594 93.3489 52.0318 92.7759 52.3496C92.2896 52.6193 91.7895 52.7118 91.3315 52.752C91.1124 52.7712 90.8707 52.7807 90.6118 52.7852L89.7896 52.7891H87.1772V55.4014C87.1772 55.9767 87.1786 56.5051 87.1401 56.9434C87.1 57.4013 87.0075 57.9014 86.7378 58.3877C86.42 58.9607 85.9476 59.4331 85.3745 59.751C84.8884 60.0204 84.3881 60.1131 83.9302 60.1533C83.4919 60.1918 82.9635 60.1904 82.3882 60.1904C81.8125 60.1904 81.2837 60.1918 80.8452 60.1533C80.4444 60.1182 80.0114 60.0437 79.5835 59.8447L79.4009 59.751C78.8281 59.4332 78.3555 58.9608 78.0376 58.3877C77.7677 57.9008 77.6751 57.3999 77.6353 56.9424C77.5971 56.5045 77.5991 55.976 77.5991 55.4014V52.7891H74.9868C74.4115 52.7891 73.8831 52.7904 73.4448 52.752C72.9869 52.7118 72.4867 52.6192 72.0005 52.3496C71.4274 52.0318 70.955 51.5594 70.6372 50.9863C70.3677 50.5002 70.2751 49.9999 70.2349 49.542C70.1964 49.1037 70.1978 48.5753 70.1978 48C70.1978 47.4244 70.1964 46.8956 70.2349 46.457C70.275 45.9991 70.3675 45.4991 70.6372 45.0127L70.7632 44.8027C71.0743 44.3242 71.4989 43.9276 72.0005 43.6494L72.0015 43.6484C72.4881 43.3789 72.9884 43.2879 73.4458 43.248C73.8837 43.2099 74.4121 43.2109 74.9868 43.2109H77.5991V40.5986L77.603 39.7764C77.6074 39.5178 77.6172 39.2765 77.6362 39.0576C77.6761 38.6001 77.7669 38.0991 78.0366 37.6123H78.0376C78.3555 37.0391 78.8281 36.5667 79.4009 36.249L79.5835 36.1553C80.0114 35.9563 80.4444 35.8818 80.8452 35.8467C81.2837 35.8082 81.8125 35.8096 82.3882 35.8096Z"
						fill={resolvedColor}
						stroke={resolvedColor}
						strokeWidth="2"
					/>
				</motion.g>
			</svg>

			{/* Brand logo - same size as eyes logo */}
			<svg
				className={cn(className, "absolute inset-0 text-white dark:text-black")}
				fill="none"
				height="96"
				style={{
					opacity: isClose ? 1 : 0,
					transition: "opacity 0.05s ease-in-out",
				}}
				viewBox="0 0 117 96"
				width="117"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Cossistant Logo</title>
				<path
					clipRule="evenodd"
					d={LOGO_D}
					fill="currentColor"
					fillRule="evenodd"
				/>
			</svg>
		</div>
	);
}
