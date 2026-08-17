import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { advisorSchema } from '../../../utils/validation'

export default createHandler(schema.advisors, advisorSchema, { entity: 'advisor' })
