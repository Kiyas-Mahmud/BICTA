import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { announcementSchema } from '../../../utils/validation'

export default createHandler(schema.announcements, announcementSchema, { richFields: ['body'], entity: 'announcement' })
