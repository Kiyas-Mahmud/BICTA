import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { timelineSchema } from '../../../utils/validation'

export default updateHandler(schema.timelineMilestones, schema.timelineMilestones.id, timelineSchema)
