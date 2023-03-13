from watchmen_auth import fake_tenant_admin, PrincipalService

from watchmen_lineage.service.lineage_service import LineageService

lineage_service = LineageService()

principal_service: PrincipalService = fake_tenant_admin("1047472206839607296")

lineage_service.init_tenant_all_lineage_data(principal_service)

lineage_service.graph_json(principal_service)


print(lineage_service.load_relevant_indicators("1078711287888358400",principal_service))

# result = lineage_service.fine_lineage_by_factor("963837989900259328", "6270b3713bee4d1db483db37c8734ff0",
#                                                 principal_service)




#

# print(result.json())
# FACTOR_6270b3713bee4d1db483db37c8734ff0_963837989900259328
#


##OBJECTIVE_TARGET_f-694983c9ddc942a8848b5b6cfcebc82f_1057272564742719488
#
# result = lineage_service.find_lineage_by_objective_target("f-694983c9ddc942a8848b5b6cfcebc82f","1057272564742719488",principal_service)
#
# result = lineage_service.find_lineage_by_objective("1057272564742719488",principal_service)
#
# print(result.json())

# FACTOR_78bf3da4f719485aa6ffeb7a7dd24c5a_1047572886203731968
# FACTOR_343f6a04bd83445893e7a8aebab79654_1047572886203731968
# FACTOR_c37faec816224ad9b56ff4ec3063d170_1047512322609844224
# FACTOR_63c88da568394dfc8567358e98bc4f63_1047572886203731968
# FACTOR_343f6a04bd83445893e7a8aebab79654_1047572886203731968
