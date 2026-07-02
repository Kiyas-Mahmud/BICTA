import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { testimonialSchema } from '../../../utils/validation'

export default updateHandler(schema.testimonials, schema.testimonials.id, testimonialSchema)
