import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { personSchema } from '../../../utils/validation'

export default createHandler(schema.people, personSchema, { richFields: ['bio'] })
