import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { scheduleItemSchema } from '../../../utils/validation'

export default updateHandler(schema.scheduleItems, schema.scheduleItems.id, scheduleItemSchema)
