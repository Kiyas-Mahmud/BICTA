import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { scheduleItemSchema } from '../../../utils/validation'

export default createHandler(schema.scheduleItems, scheduleItemSchema, { entity: 'schedule item' })
