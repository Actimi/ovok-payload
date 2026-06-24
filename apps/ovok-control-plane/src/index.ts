import { serve } from '@hono/node-server'

import { app } from './app.js'

const port = Number(process.env.PORT || 4001)

serve({ fetch: app.fetch, hostname: '0.0.0.0', port }, () => {
  console.log(`ovok-control-plane listening on 0.0.0.0:${port}`)
})
