import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.timelineMilestones, schema.timelineMilestones.id)
