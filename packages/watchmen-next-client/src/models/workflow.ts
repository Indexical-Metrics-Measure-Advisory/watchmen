import { MainNavKey } from "./nav";
import { TaskStatus } from "./common";

export type WorkflowTask = {
	id: string;
	module: MainNavKey;
	title: string;
	description: string;
	status: TaskStatus;
	requiresUserConfirmation?: boolean;
};
