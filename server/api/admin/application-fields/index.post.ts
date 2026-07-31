import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { applicationFieldSchema } from '../../../utils/validation'

export default createHandler(schema.applicationFields, applicationFieldSchema)
