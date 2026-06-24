import { Hono } from 'hono'

import { internalAuth } from './middleware/auth.js'
import { healthRouter } from './routes/health.js'
import { projectsRouter } from './routes/projects.js'

export const createApp = () => {
  const app = new Hono()

  app.route('/health', healthRouter)
  app.use('/v1/projects/*', internalAuth)
  app.use('/v1/projects', internalAuth)
  app.route('/v1/projects', projectsRouter)

  return app
}

export const app = createApp()
