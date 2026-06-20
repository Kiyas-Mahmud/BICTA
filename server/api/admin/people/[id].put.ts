import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { personSchema } from '../../../utils/validation'

export default updateHandler(schema.people, schema.people.id, personSchema, { richFields: ['bio'] })
