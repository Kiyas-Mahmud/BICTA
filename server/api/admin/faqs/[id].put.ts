import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { faqSchema } from '../../../utils/validation'

export default updateHandler(schema.faqs, schema.faqs.id, faqSchema, { richFields: ['answer'] })
