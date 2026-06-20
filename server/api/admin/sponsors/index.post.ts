import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { sponsorSchema } from '../../../utils/validation'

export default createHandler(schema.sponsors, sponsorSchema)
