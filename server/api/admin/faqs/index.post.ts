import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { faqSchema } from '../../../utils/validation'

export default createHandler(schema.faqs, faqSchema, { richFields: ['answer'] })
