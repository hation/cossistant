import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

// This is fix vercel build
export const resend = (apiKey
	? new Resend(apiKey)
	: undefined) as unknown as Resend;
