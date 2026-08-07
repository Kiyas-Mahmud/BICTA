import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.scheduleItems, schema.scheduleItems.id, { entity: 'schedule item' })
