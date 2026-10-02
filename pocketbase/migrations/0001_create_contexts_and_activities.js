migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Create contexts collection
    const contexts = new Collection({
      name: 'contexts',
      type: 'base',
      listRule: 'owner_id = @request.auth.id',
      viewRule: 'owner_id = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: 'owner_id = @request.auth.id',
      deleteRule: 'owner_id = @request.auth.id',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'summary', type: 'text' },
        { name: 'content', type: 'text', required: true },
        {
          name: 'source',
          type: 'select',
          required: true,
          values: ['chatgpt', 'claude', 'gemini', 'manual', 'vm'],
          maxSelect: 1,
        },
        { name: 'tags', type: 'json' },
        {
          name: 'owner_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'images', type: 'file', maxSelect: 5, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contexts_owner_id ON contexts (owner_id)',
        'CREATE INDEX idx_contexts_created ON contexts (created DESC)',
      ],
    })
    app.save(contexts)

    // 2. Create activities collection
    const activities = new Collection({
      name: 'activities',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'context_id',
          type: 'relation',
          required: false,
          collectionId: contexts.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'action',
          type: 'select',
          required: true,
          values: ['created', 'updated', 'exported', 'deleted'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_activities_user_created ON activities (user_id, created DESC)'],
    })
    app.save(activities)
  },
  (app) => {
    try {
      const activities = app.findCollectionByNameOrId('activities')
      app.delete(activities)
    } catch (_) {}
    try {
      const contexts = app.findCollectionByNameOrId('contexts')
      app.delete(contexts)
    } catch (_) {}
  },
)
