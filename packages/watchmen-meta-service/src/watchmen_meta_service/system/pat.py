from watchmen_model.system import PersonalAccessToken
from watchmen_storage import EntityRow, EntityShaper


class PatShaper(EntityShaper):
	def serialize(self, pat: PersonalAccessToken) -> EntityRow:
		return {
			'pat_id': pat.patId,
			'token': pat.token,
			'user_id': pat.userId,
			'username': pat.username,
			'tenant_id': pat.tenantId,
			'note': pat.note,
			'expired': pat.expired,
			'permissions': pat.permissions
		}

	def deserialize(self, row: EntityRow) -> PersonalAccessToken:
		return PersonalAccessToken(
			patId=row.get('pat_id'),
			token=row.get('token'),
			userId=row.get('user_id'),
			username=row.get('username'),
			tenantId=row.get('tenant_id'),
			note=row.get('note'),
			expired=row.get('expired'),
			permissions=row.get('permissions')
		)


PAT_ENTITY_NAME = 'pats'
PAT_ENTITY_SHAPER = PatShaper()
