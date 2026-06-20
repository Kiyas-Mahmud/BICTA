import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.newsletterSubscribers, schema.newsletterSubscribers.id)
