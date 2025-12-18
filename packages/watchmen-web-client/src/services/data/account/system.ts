import { Apis, get } from "../apis";
import { isMockService } from "../utils";

export const fetchSystemEnv = async (): Promise<string> => {
    if (isMockService()) {
        return new Promise<string>(resolve => {
            setTimeout(() => {
                resolve("design");
            }, 300);
        });
    } else {
        return await get({api: Apis.SYSTEM_ENV});
    }
};