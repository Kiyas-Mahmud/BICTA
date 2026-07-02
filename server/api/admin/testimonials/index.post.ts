import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { testimonialSchema } from '../../../utils/validation'

export default createHandler(schema.testimonials, testimonialSchema)
