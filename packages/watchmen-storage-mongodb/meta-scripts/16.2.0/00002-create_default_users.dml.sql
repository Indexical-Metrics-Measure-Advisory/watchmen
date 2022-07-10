db.users.insertOne({
    _id: '1', user_id: '1', name: 'imma-super', nickname: 'IMMA Super', password: '$2b$12$TLbw0H1y70TRO51Jf6V6y.Yf8aHO.xr7VcCdsZInYk5qhSf8Po6Bu',
    is_active: 1, group_ids: [], role: 'superadmin', tenant_id: '-1',
    created_at: new Date(), created_by: '-1', last_modified_at: new Date(), last_modified_by: '-1', version: 1
});
db.users.insertOne({
    _id: '2', user_id: '2', name: 'imma-admin', nickname: 'IMMA Admin', password: '$2b$12$kBzIsBbQYaqR5fu89ph6OO.KkYCO0IIXLflqRBTHZ8/oIxXxnX0Oi',
    is_active: 1, group_ids: [], role: 'admin', tenant_id: '1',
    created_at: new Date(), created_by: '-1', last_modified_at: new Date(), last_modified_by: '-1', version: 1
});
db.users.insertOne({
    _id: '3', user_id: '3', name: 'imma-user', nickname: 'IMMA User', password: '$2b$12$9kuzj0k/oFrknTm6XIRlGOKfHWS3.yr33drk/QTWuW.Lt86t0TKFu',
    is_active: 1, group_ids: [], role: 'console', tenant_id: 1,
    created_at: new Date(), created_by: '-1', last_modified_at: new Date(), last_modified_by: '-1', version: 1
});