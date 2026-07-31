import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { applicationFieldSchema } from '../../../utils/validation'

export default updateHandler(schema.applicationFields, schema.applicationFields.id, applicationFieldSchema)
