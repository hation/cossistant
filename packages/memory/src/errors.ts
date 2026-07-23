type MemoryErrorOptions = {
	cause?: unknown;
};

export class MemoryValidationError extends Error {
	constructor(message: string, options?: MemoryErrorOptions) {
		super(
			message,
			options?.cause === undefined ? undefined : { cause: options.cause }
		);
		this.name = "MemoryValidationError";
	}
}

export class MemoryQueryError extends Error {
	constructor(message: string, options?: MemoryErrorOptions) {
		super(
			message,
			options?.cause === undefined ? undefined : { cause: options.cause }
		);
		this.name = "MemoryQueryError";
	}
}
