import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { advisorSchema } from '../../../utils/validation'

export default updateHandler(schema.advisors, schema.advisors.id, advisorSchema, { entity: 'advisor' })
