import {isDataQualityCenterEnabled} from '@/feature-switch';
import {isAdmin, isSuperAdmin} from '@/services/data/account';

export const isConsoleAvailable = () => !isSuperAdmin();
export const isAdminAvailable = () => isAdmin() || isSuperAdmin();
export const isDataQualityAvailable = () => isAdmin() && !isSuperAdmin() && isDataQualityCenterEnabled();
export const isIndicatorAvailable = () => isAdmin() && !isSuperAdmin();