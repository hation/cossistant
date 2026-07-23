import { env } from "@api/env";
import { WORKFLOW, type WorkflowDataMap } from "@api/workflows/types";
import { Client } from "@upstash/workflow";

const client = new Client({
	token: env.QSTASH_TOKEN,
});

export { client as workflowClient };

type TriggerWorkflowParams<
	T extends keyof WorkflowDataMap = keyof WorkflowDataMap,
> = {
	path: T;
	data: WorkflowDataMap[T];
	workflowRunId?: string;
};

export const getWorkflowUrl = (path: keyof typeof WORKFLOW) =>
	`${env.BETTER_AUTH_URL}/workflow/${WORKFLOW[path]}`;

export const triggerWorkflow = async <T extends keyof WorkflowDataMap>({
	path,
	data,
	workflowRunId,
}: TriggerWorkflowParams<T>) =>
	client.trigger({
		url: `${env.BETTER_AUTH_URL}/workflow/${path}`,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
		...(workflowRunId ? { workflowRunId } : {}),
	});
