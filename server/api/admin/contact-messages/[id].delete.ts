import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.contactMessages, schema.contactMessages.id)
