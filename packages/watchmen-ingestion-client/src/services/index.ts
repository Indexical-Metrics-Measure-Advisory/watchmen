// Export all services from a single entry point
// Only export the service instances, not the types (moved to models folder)
export { default as apiService } from './api';
// export { default as configService } from './configService';
export { default as monitorService } from './monitorService';
export { default as discoveryService } from './discoveryService';
export { default as dataSourceService } from './dataSourceService';
export { tableService } from './tableService';
export { moduleService } from './moduleService';
export { modelService } from './modelService';
export { collectorService } from './collectorService';

// Also export default instances for flexibility
import apiService from './api';
// import configService from './configService';
import monitorService from './monitorService';
import dataSourceService from './dataSourceService';
import { tableService } from './tableService';
import { moduleService } from './moduleService';
import { modelService } from './modelService';
import { collectorService } from './collectorService';

export default {
  api: apiService,
  // config: configService,
  monitor: monitorService,
  table: tableService,
  module: moduleService,
  model: modelService,
  collector: collectorService,
  dataSource: dataSourceService
};