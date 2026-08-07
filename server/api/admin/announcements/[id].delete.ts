import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.announcements, schema.announcements.id, { entity: 'announcement' })
