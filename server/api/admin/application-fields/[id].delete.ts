import { deleteHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'

export default deleteHandler(schema.applicationFields, schema.applicationFields.id, { entity: 'application field' })
