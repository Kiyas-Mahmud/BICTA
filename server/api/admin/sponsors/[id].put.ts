import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { sponsorSchema } from '../../../utils/validation'

export default updateHandler(schema.sponsors, schema.sponsors.id, sponsorSchema)
