import {askRecommendation} from '@/services/copilot/ask-recommendation';
import {RecommendationType} from '@/services/copilot/types';
import {
	Command,
	createAskRecommendationCommand,
	createDoAskRecommendationCommand,
	createRestartSessionCommand,
	FreeTextCmd
} from '@/widgets/chatbot';
import {Lang} from '@/widgets/langs';

export const CONNECTED_DERIVED_OBJECTIVE_COMMANDS: Array<Command> = [
	FreeTextCmd,
	createAskRecommendationCommand({
		greeting: Lang.COPILOT.REPLY_ASKING_RECOMMENDATION,
		action: async (sessionId: string) => await askRecommendation(sessionId, RecommendationType.CONNECTED_SPACE)
	}),
	createRestartSessionCommand({
		greeting: Lang.COPILOT.DERIVED_OBJECTIVE.GREETING_RESTART_SESSION,
		askRestartCommand: async () => {
			return {
				commands: [createDoAskRecommendationCommand({
					greeting: Lang.COPILOT.REPLY_ASKING_RECOMMENDATION,
					action: async (sessionId: string) => await askRecommendation(sessionId, RecommendationType.CONNECTED_SPACE)
				})]
			};
		}
	})];
// export const CONNECTED_SPACE_HELP_COMMAND = createHelpCmd([]);